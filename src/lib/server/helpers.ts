import type { Session } from "#lib/server/auth.js";
import type { users } from "#lib/server/db/schema.js";
import { error } from "@sveltejs/kit";
import type z from "zod";

export function parseRequestBody<T extends z.ZodType>(
  request: Request,
  schema: T,
): Promise<z.core.output<T>>;
export function parseRequestBody(request: Request): Promise<unknown>;

export async function parseRequestBody<T extends z.ZodType>(
  request: Request,
  schema?: T,
): Promise<z.core.output<T>> {
  const data = await request.json();
  if (schema) return schema.parse(data);
  return data;
}

export function parseSearchParams<T extends z.ZodObject>(
  params: URLSearchParams,
  schema: T,
): z.core.output<T>;
export function parseSearchParams(params: URLSearchParams): Record<string, string | string[]>;
export function parseSearchParams<T extends z.ZodType>(
  params: URLSearchParams,
  schema?: T,
): Record<string, string | string[]> | z.core.output<T> {
  const paramsObject = params
    .entries()
    .reduce<Record<string, string | string[]>>((prev, [key, value]) => {
      const existing = prev[key];

      if (Array.isArray(existing)) return { ...prev, [key]: [...existing, value] };
      if (existing === undefined) return { ...prev, [key]: value };
      return { ...prev, [key]: [existing, value] };
    }, {});
  if (schema) return schema.parse(paramsObject);
  return paramsObject;
}

type NoDup<T extends readonly unknown[]> = T extends readonly [infer H, ...infer R]
  ? H extends R[number]
    ? never
    : [H, ...NoDup<R>]
  : T;

export function checkAuthAccess<const TRoles extends ReadonlyArray<typeof users.$inferSelect.role>>(
  locals: App.Locals,
  roles?: NoDup<TRoles> extends never ? never : TRoles,
): Session["user"] & { role: TRoles[number] } {
  const { user } = locals;

  if (!user) return error(401);
  // Ожидающий подтверждения, отклонённый или заблокированный пользователь
  // не получает доступ к данным, даже если сессия ещё жива (ФТ-2.5, ФТ-4.5)
  if (user.status !== "active") return error(403);
  if (roles && !roles.includes(user.role)) return error(403);

  return user;
}
