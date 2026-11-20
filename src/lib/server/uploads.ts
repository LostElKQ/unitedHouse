// =====================================================================
// Фото к заявкам (ФТ-14.4) и отчётам о выполнении работ (ФТ-16.5).
// Файлы — в каталоге UPLOAD_DIR, в БД (attachments) — только путь (СТ 4.4).
// Тип проверяем по содержимому файла (file-type), а не по расширению
// и не по Content-Type от браузера.
// =====================================================================
import { UPLOAD_DIR } from "$app/env/private";
import { PHOTO_MAX_BYTES } from "#lib/schemas.js";
import { fileTypeFromBuffer } from "file-type";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { badRequest } from "./api-helpers.ts";

const ALLOWED: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png" };

export type StoredPhoto = { filePath: string; mimeType: string; sizeBytes: number };

function root(): string {
  return path.resolve(UPLOAD_DIR);
}

/** Проверка и сохранение фото; field — имя поля формы для ошибки */
export async function savePhotos(
  files: File[],
  max: number,
  field = "photos",
): Promise<StoredPhoto[]> {
  const real = files.filter((f) => f.size > 0);
  if (real.length > max) badRequest({ [field]: [`Можно приложить не более ${max} фото`] });

  const checked: Array<{ buf: Buffer; mime: string; ext: string }> = [];
  for (const f of real) {
    if (f.size > PHOTO_MAX_BYTES) badRequest({ [field]: [`«${f.name}»: размер больше 5 МБ`] });
    const buf = Buffer.from(await f.arrayBuffer());
    const type = await fileTypeFromBuffer(buf);
    const ext = type ? ALLOWED[type.mime] : undefined;
    if (!type || !ext) badRequest({ [field]: [`«${f.name}»: только JPG или PNG`] });
    checked.push({ buf, mime: type.mime, ext });
  }

  const now = new Date();
  const sub = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  await mkdir(path.join(root(), sub), { recursive: true });

  const saved: StoredPhoto[] = [];
  for (const c of checked) {
    const rel = `${sub}/${randomUUID()}.${c.ext}`;
    await writeFile(path.join(root(), rel), c.buf);
    saved.push({ filePath: rel, mimeType: c.mime, sizeBytes: c.buf.length });
  }
  return saved;
}

/** Удалить файлы, если запись в БД не удалась */
export async function removePhotos(photos: StoredPhoto[]): Promise<void> {
  await Promise.all(photos.map((p) => unlink(path.join(root(), p.filePath)).catch(() => {})));
}

export async function readPhoto(filePath: string): Promise<Buffer> {
  const full = path.resolve(root(), filePath);
  // защита от выхода за пределы каталога
  if (!full.startsWith(root() + path.sep)) throw new Error("Bad path");
  return readFile(full);
}

/** Список файлов из multipart-формы */
export function filesFrom(form: FormData, field = "photos"): File[] {
  return form.getAll(field).filter((v): v is File => v instanceof File);
}

/** Обычные поля multipart-формы как объект строк */
export function fieldsFrom(form: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of form.entries()) if (typeof v === "string") out[k] = v;
  return out;
}
