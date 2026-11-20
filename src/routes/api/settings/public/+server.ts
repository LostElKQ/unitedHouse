// Публичные сведения о ТСЖ: телефоны правления и аварийной службы
// (ФТ-2.5 — контакт правления для отклонённых и заблокированных,
// ФТ-14.6 — телефон аварийной службы), часовой пояс (раздел 7).
// Доступно без входа.
import { db } from "#lib/server/db/index.js";
import { hoaSettings } from "#lib/server/db/schema.js";
import type { PublicSettings } from "#lib/api/types.js";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async () => {
  const [s] = await db
    .select({
      name: hoaSettings.name,
      address: hoaSettings.address,
      boardPhone: hoaSettings.boardPhone,
      emergencyPhone: hoaSettings.emergencyPhone,
      timezone: hoaSettings.timezone,
      readingsStartDay: hoaSettings.readingsStartDay,
      readingsEndDay: hoaSettings.readingsEndDay,
    })
    .from(hoaSettings);

  const body: PublicSettings = s ?? {
    name: "",
    address: "",
    boardPhone: null,
    emergencyPhone: null,
    timezone: "Europe/Moscow",
    readingsStartDay: 20,
    readingsEndDay: 25,
  };
  return Response.json(body);
};
