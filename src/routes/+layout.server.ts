import { db } from "#lib/server/db/index.js";
import { apartments, hoaSettings } from "#lib/server/db/schema.js";
import type { CurrentUser } from "#lib/types.js";
import { eq } from "drizzle-orm";
import type { LayoutServerLoad } from "./$types";

// Текущий пользователь и контакты ТСЖ для всех страниц
// (шапка, меню, проверка роли, телефон аварийной службы, часовой пояс).
// Отдаём только нужные интерфейсу поля.
export const load: LayoutServerLoad = async ({ locals }) => {
  const u = locals.user;

  let apartment: CurrentUser["apartment"] = null;
  if (u?.apartmentId) {
    const [a] = await db
      .select({ number: apartments.number, entrance: apartments.entrance })
      .from(apartments)
      .where(eq(apartments.id, u.apartmentId));
    apartment = a ?? null;
  }

  const user: CurrentUser | null = u
    ? {
        id: Number(u.id),
        name: u.name,
        email: u.email,
        role: u.role,
        status: u.status,
        mustChangePassword: Boolean(u.mustChangePassword),
        apartmentId: u.apartmentId ?? null,
        apartment,
      }
    : null;

  const [hoa] = await db
    .select({
      name: hoaSettings.name,
      boardPhone: hoaSettings.boardPhone,
      emergencyPhone: hoaSettings.emergencyPhone,
      timezone: hoaSettings.timezone,
    })
    .from(hoaSettings);

  return {
    user,
    hoa: hoa ?? { name: "", boardPhone: null, emergencyPhone: null, timezone: "Europe/Moscow" },
  };
};
