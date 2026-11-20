// =====================================================================
// Перенаправления по роли и статусу для страниц (не для API — API
// проверяет права сам через checkAuthAccess).
//   ФТ-2.4: житель → «/», администратор → «/admin», исполнитель → «/works»
//   ФТ-2.5: «Ожидает подтверждения» → экран ожидания
//   ФТ-4.7: временный пароль → обязательная смена
// =====================================================================
import { redirect } from "@sveltejs/kit";

type Role = "resident" | "admin" | "executor";

type LocalsUser = NonNullable<App.Locals["user"]>;

export function homeFor(role: Role): "/" | "/admin" | "/works" {
  if (role === "admin") return "/admin";
  if (role === "executor") return "/works";
  return "/";
}

/** Куда отправить пользователя, который вошёл, но ещё не может работать */
function gate(user: LocalsUser): string | null {
  if (user.status === "pending") return "/pending";
  if (user.mustChangePassword) return "/change-password";
  return null;
}

/** Защита раздела роли: (resident), admin, works */
export function requireRole(locals: App.Locals, url: URL, role: Role): LocalsUser {
  const user = locals.user;
  if (!user) {
    const back = url.pathname + url.search;
    redirect(303, `/login${back === "/" ? "" : `?redirectTo=${encodeURIComponent(back)}`}`);
  }
  const blocked = gate(user);
  if (blocked) redirect(303, blocked);
  if (user.role !== role) redirect(303, homeFor(user.role));
  return user;
}

/** Безопасный адрес возврата: только внутренний путь этого сайта */
function safeBack(back: string | null): string | null {
  if (!back || !back.startsWith("/") || back.startsWith("//")) return null;
  return back;
}

/**
 * Страницы входа и регистрации: вошедшего отправляем на его главную
 * или туда, откуда его попросили войти (?redirectTo=…).
 */
export function redirectIfSignedIn(locals: App.Locals, url: URL): void {
  const user = locals.user;
  if (!user) return;
  redirect(303, gate(user) ?? safeBack(url.searchParams.get("redirectTo")) ?? homeFor(user.role));
}

/** Экран ожидания: только для пользователя в статусе «Ожидает подтверждения» */
export function requirePending(locals: App.Locals): LocalsUser {
  const user = locals.user;
  if (!user) redirect(303, "/login");
  if (user.status !== "pending") redirect(303, gate(user) ?? homeFor(user.role));
  return user;
}

/** Смена временного пароля: только для вошедшего с отметкой mustChangePassword */
export function requirePasswordChange(locals: App.Locals): LocalsUser {
  const user = locals.user;
  if (!user) redirect(303, "/login");
  if (!user.mustChangePassword) redirect(303, gate(user) ?? homeFor(user.role));
  return user;
}
