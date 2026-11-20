// Всплывающие уведомления об успешных действиях и ошибках (СТ 5.1).
// Использование в любом компоненте:
//   import { toast } from "#lib/components/ui/toast.svelte.js";
//   toast.success("Показания отправлены");
//   toast.error("Не удалось сохранить");

export type ToastKind = "success" | "error" | "info";
export type ToastItem = { id: number; kind: ToastKind; text: string };

const DURATION_MS = 5000;

let nextId = 1;
const items: ToastItem[] = $state([]);

function push(kind: ToastKind, text: string): void {
  const id = nextId++;
  items.push({ id, kind, text });
  setTimeout(() => dismiss(id), DURATION_MS);
}

function dismiss(id: number): void {
  const index = items.findIndex((t) => t.id === id);
  if (index !== -1) items.splice(index, 1);
}

export const toast = {
  get items(): readonly ToastItem[] {
    return items;
  },
  success: (text: string): void => push("success", text),
  error: (text: string): void => push("error", text),
  info: (text: string): void => push("info", text),
  dismiss,
};
