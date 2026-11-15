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
  try {
    const data = await request.json();
    if (schema) return schema.parse(data);
    return data;
  } catch (e) {
    if (e instanceof SyntaxError) return error(400);
    throw e;
  }
}

export function parseSearchParams<T extends z.ZodType>(
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
