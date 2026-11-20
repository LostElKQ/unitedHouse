import type { CurrentUser } from "#lib/types.js";
import type { LayoutServerLoad } from "./$types";

// Текущий пользователь для всех страниц (шапка, меню, проверка роли).
// Отдаём только нужные интерфейсу поля, без служебных.
export const load: LayoutServerLoad = ({ locals }) => {
  const u = locals.user;
  const user: CurrentUser | null = u
    ? {
        id: Number(u.id),
        name: u.name,
        email: u.email,
        role: u.role as CurrentUser["role"],
        status: u.status as CurrentUser["status"],
        mustChangePassword: Boolean(u.mustChangePassword),
        apartmentId: u.apartmentId ?? null,
      }
    : null;
  return { user };
};
