// Проверка формы на клиенте той же zod-схемой, что и на сервере.
// Ошибки возвращаются в том же виде, что и fieldErrors из API, поэтому
// в форме один и тот же объект errors заполняется и при клиентской
// проверке, и при ответе 400 от сервера.
import z from "zod";
import type { FieldErrors } from "./api/client.ts";

export type Validated<T> = { ok: true; data: T } | { ok: false; errors: FieldErrors };

export function validate<S extends z.ZodType>(schema: S, input: unknown): Validated<z.output<S>> {
  const result = schema.safeParse(input);
  if (result.success) return { ok: true, data: result.data };
  const flat = z.flattenError(result.error);
  const errors: FieldErrors = { ...flat.fieldErrors };
  if (flat.formErrors.length > 0) errors["_form"] = flat.formErrors;
  return { ok: false, errors };
}
