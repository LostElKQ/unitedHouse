// =====================================================================
// «Единый дом» — авторизация на Better Auth
// Покрывает: 3.1 регистрация, 3.2 вход, 3.3 восстановление пароля,
// 3.4 (статусы, создание исполнителей), 3.22 смена пароля.
// =====================================================================
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { sveltekitCookies } from "better-auth/svelte-kit";
import { getRequestEvent } from "$app/server";
import { BETTER_AUTH_SECRET, ORIGIN } from "$app/env/private";
import { eq, sql } from "drizzle-orm";
import { db } from "./db";
import * as schema from "./db/schema";

const MAX_FAILED_LOGINS = 5; // ФТ-2.3
const LOCK_MINUTES = 15;
const PASSWORD_RE = /^(?=.*\p{L})(?=.*\d).{8,}$/u; // ФТ-1.5: ≥ 8 символов, буква и цифра

export const auth = betterAuth({
  secret: BETTER_AUTH_SECRET,
  baseURL: ORIGIN,

  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
    usePlural: true, // таблицы users, sessions, accounts, verifications
  }),

  advanced: {
    database: { generateId: "serial" }, // числовые id из PostgreSQL
  },

  user: {
    // Наши поля пользователя. input: false — клиент не может их передать.
    additionalFields: {
      apartmentId: { type: "number", required: false, input: true },
      phone: { type: "string", required: false, input: true },
      pdConsentAt: { type: "date", required: false, input: true },
      role: { type: "string", required: false, input: false, defaultValue: "resident" },
      status: { type: "string", required: false, input: false, defaultValue: "pending" },
      rejectionReason: { type: "string", required: false, input: false },
      mustChangePassword: { type: "boolean", required: false, input: false, defaultValue: false },
    },
  },

  emailAndPassword: {
    enabled: true,
    autoSignIn: false, // ФТ-1.7: после регистрации — ждать подтверждения
    minPasswordLength: 8,
    maxPasswordLength: 128,
    resetPasswordTokenExpiresIn: 60 * 60, // ФТ-3.1: ссылка действует 1 час
    revokeSessionsOnPasswordReset: true, // ФТ-3.4
    sendResetPassword: async ({ user, url }) => {
      // TODO: отправка письма через SMTP (nodemailer)
      console.log(`[reset-password] ${user.email}: ${url}`);
    },
  },

  session: {
    expiresIn: 60 * 60 * 24, // ФТ-2.6: 24 часа бездействия
    updateAge: 60 * 60, // при активности срок продлевается раз в час
  },

  rateLimit: {
    enabled: true,
    customRules: {
      "/request-password-reset": { window: 60, max: 1 }, // ФТ-3.3: не чаще раза в минуту
    },
  },

  databaseHooks: {
    user: {
      create: {
        before: async (user, ctx): Promise<{ data: typeof user } | undefined> => {
          // Самостоятельная регистрация — всегда житель «Ожидает подтверждения»
          if (ctx?.path === "/sign-up/email") {
            if (!user["apartmentId"]) {
              throw new APIError("BAD_REQUEST", {
                message: "Квартира с таким номером не найдена. Обратитесь в правление ТСЖ",
              });
            }
            if (!user["pdConsentAt"]) {
              throw new APIError("BAD_REQUEST", {
                message: "Нужно согласие на обработку персональных данных",
              });
            }
            return { data: { ...user, role: "resident", status: "pending" } };
          }
          return;
        },
      },
    },
    session: {
      create: {
        // ФТ-2.5, 4.5: отклонённый и заблокированный не входят.
        // «Ожидает подтверждения» входит и видит экран ожидания.
        before: async (session) => {
          const [u] = await db
            .select({ status: schema.users.status, reason: schema.users.rejectionReason })
            .from(schema.users)
            .where(eq(schema.users.id, Number(session.userId)));
          if (u?.status === "blocked") {
            throw new APIError("FORBIDDEN", {
              code: "USER_BLOCKED",
              message: "Учётная запись заблокирована. Обратитесь в правление ТСЖ",
            });
          }
          if (u?.status === "rejected") {
            throw new APIError("FORBIDDEN", {
              code: "USER_REJECTED",
              message: `Регистрация отклонена: ${u.reason ?? ""}`,
            });
          }
        },
      },
    },
  },

  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      // ФТ-1.5: в пароле есть буква и цифра
      const pwd = ctx.body?.password ?? ctx.body?.newPassword;
      if (
        ["/sign-up/email", "/reset-password", "/change-password"].includes(ctx.path) &&
        typeof pwd === "string" &&
        !PASSWORD_RE.test(pwd)
      ) {
        throw new APIError("BAD_REQUEST", {
          message: "Пароль: не менее 8 символов, хотя бы одна буква и одна цифра",
        });
      }

      // ФТ-2.3: вход заблокирован после 5 неудачных попыток
      if (ctx.path === "/sign-in/email" && typeof ctx.body?.email === "string") {
        const [u] = await db
          .select({ lockedUntil: schema.users.lockedUntil })
          .from(schema.users)
          .where(sql`lower(${schema.users.email}) = lower(${ctx.body.email})`);
        if (u?.lockedUntil && u.lockedUntil > new Date()) {
          throw new APIError("TOO_MANY_REQUESTS", {
            message: `Вход временно заблокирован. Попробуйте через ${LOCK_MINUTES} минут`,
          });
        }
      }
    }),

    after: createAuthMiddleware(async (ctx) => {
      // ФТ-2.3: считаем неудачные попытки входа
      if (ctx.path === "/sign-in/email" && typeof ctx.body?.email === "string") {
        const byEmail = sql`lower(${schema.users.email}) = lower(${ctx.body.email})`;
        const failed =
          ctx.context.returned instanceof APIError && ctx.context.returned.statusCode === 401;
        if (failed) {
          await db
            .update(schema.users)
            .set({
              failedLoginAttempts: sql`${schema.users.failedLoginAttempts} + 1`,
              lockedUntil: sql`CASE WHEN ${schema.users.failedLoginAttempts} + 1 >= ${MAX_FAILED_LOGINS}
							THEN now() + make_interval(mins => ${LOCK_MINUTES}) END`,
            })
            .where(byEmail);
        } else if (ctx.context.newSession) {
          await db
            .update(schema.users)
            .set({ failedLoginAttempts: 0, lockedUntil: null })
            .where(byEmail);
        }
      }

      // ФТ-4.7: исполнитель сменил временный пароль
      if (
        ctx.path === "/change-password" &&
        ctx.context.session &&
        !(ctx.context.returned instanceof APIError)
      ) {
        await db
          .update(schema.users)
          .set({ mustChangePassword: false })
          .where(eq(schema.users.id, Number(ctx.context.session.user.id)));
      }
    }),
  },

  plugins: [sveltekitCookies(getRequestEvent)], // должен быть последним
});

/**
 * Создание пользователя администратором (ФТ-4.7 — исполнитель)
 * или первого администратора при развёртывании (scripts/create-admin.ts).
 * Пароль временный: при первом входе нужно сменить.
 */
export async function createStaffUser(input: {
  name: string;
  email: string;
  phone?: string;
  password: string;
  role: "admin" | "executor";
}): ReturnType<Awaited<typeof auth.$context>["internalAdapter"]["createUser"]> {
  if (!PASSWORD_RE.test(input.password))
    throw new Error("Пароль: не менее 8 символов, буква и цифра");
  const ctx = await auth.$context;
  const user = await ctx.internalAdapter.createUser(
    {
      name: input.name,
      email: input.email.toLowerCase(),
      emailVerified: false,
      phone: input.phone ?? null,
      role: input.role,
      status: "active",
      mustChangePassword: true,
    },
    { method: "admin" },
  );
  await ctx.internalAdapter.linkAccount({
    userId: user.id,
    providerId: "credential",
    accountId: String(user.id),
    password: await ctx.password.hash(input.password),
  });
  return user;
}

export type Session = typeof auth.$Infer.Session;
