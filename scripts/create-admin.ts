// Первая учётная запись администратора при развёртывании (примечание к п. 3.4 СТ).
// Запуск: npx tsx scripts/create-admin.ts "Смирнова Ольга Петровна" admin@example.ru ВременныйПароль1
//
// Скрипт работает вне SvelteKit, поэтому собирает свой экземпляр Better Auth
// с тем же адаптером и полями, что и src/lib/server/auth.ts.
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../src/lib/server/db/schema";

const [name, email, password] = process.argv.slice(2);
if (!name || !email || !password) {
  console.error('Использование: npx tsx scripts/create-admin.ts "ФИО" email пароль');
  process.exit(1);
}
if (!process.env["DATABASE_URL"]) throw new Error("DATABASE_URL is not set");

const client = postgres(process.env["DATABASE_URL"]);
const db = drizzle(client, { schema });
const auth = betterAuth({
  secret: process.env["BETTER_AUTH_SECRET"] ?? "script-only-secret-not-used-for-sessions",
  database: drizzleAdapter(db, { provider: "pg", schema, usePlural: true }),
  advanced: { database: { generateId: "serial" } },
  emailAndPassword: { enabled: true },
  user: {
    additionalFields: {
      role: { type: "string", required: false },
      status: { type: "string", required: false },
      mustChangePassword: { type: "boolean", required: false },
    },
  },
});

const ctx = await auth.$context;
const user = await ctx.internalAdapter.createUser(
  {
    name,
    email: email.toLowerCase(),
    emailVerified: false,
    role: "admin",
    status: "active",
    mustChangePassword: true,
  },
  { method: "admin" },
);
await ctx.internalAdapter.linkAccount({
  userId: user.id,
  providerId: "credential",
  accountId: String(user.id),
  password: await ctx.password.hash(password),
});
console.log(
  `Администратор создан: id=${user.id}, ${user.email}. При первом входе нужно сменить пароль.`,
);
await client.end();
