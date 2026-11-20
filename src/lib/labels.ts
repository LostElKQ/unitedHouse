// =====================================================================
// Русские подписи для значений перечислений БД (СТ v1.0, раздел 4.2).
// В базе и API значения на английском, в интерфейсе — только эти подписи.
// Типы берутся прямо из src/lib/server/db/enums.ts (import type не тянет
// серверный код в браузер), поэтому новое значение в БД сразу даст
// ошибку типов здесь, пока для него не добавят подпись.
// =====================================================================
import type * as enums from "#lib/server/db/enums.js";

type EnumValue<T extends { enumValues: readonly string[] }> = T["enumValues"][number];

export type UserRole = EnumValue<typeof enums.userRole>;
export type UserStatus = EnumValue<typeof enums.userStatus>;
export type PeriodStatus = EnumValue<typeof enums.periodStatus>;
export type CalcMethod = EnumValue<typeof enums.calcMethod>;
export type PaymentStatus = EnumValue<typeof enums.paymentStatus>;
export type Category = EnumValue<typeof enums.category>;
export type RequestLocation = EnumValue<typeof enums.requestLocation>;
export type WorkLocation = EnumValue<typeof enums.workLocation>;
export type Priority = EnumValue<typeof enums.priority>;
export type RequestStatus = EnumValue<typeof enums.requestStatus>;
export type WorkType = EnumValue<typeof enums.workType>;
export type WorkStatus = EnumValue<typeof enums.workStatus>;
export type Importance = EnumValue<typeof enums.importance>;

export const userRoleLabels: Record<UserRole, string> = {
  resident: "Житель",
  admin: "Администратор",
  executor: "Исполнитель",
};

export const userStatusLabels: Record<UserStatus, string> = {
  pending: "Ожидает подтверждения",
  active: "Активен",
  rejected: "Отклонён",
  blocked: "Заблокирован",
};

export const periodStatusLabels: Record<PeriodStatus, string> = {
  readings_open: "Приём показаний открыт",
  readings_closed: "Приём показаний закрыт",
  charges_formed: "Начисления сформированы",
  published: "Квитанции опубликованы",
};

export const calcMethodLabels: Record<CalcMethod, string> = {
  area: "По площади",
  cold_water: "По счётчику ХВС",
  hot_water: "По счётчику ГВС",
  fixed: "Фиксированный",
};

/** Единица ставки, подставляется автоматически (ФТ-7.2) */
export const calcMethodRateUnits: Record<CalcMethod, string> = {
  area: "руб./м²",
  cold_water: "руб./м³",
  hot_water: "руб./м³",
  fixed: "руб. с квартиры",
};

export const paymentStatusLabels: Record<PaymentStatus, string> = {
  unpaid: "Не оплачено",
  partially_paid: "Частично оплачено",
  paid: "Оплачено",
};

export const categoryLabels: Record<Category, string> = {
  plumbing: "Сантехника",
  electrical: "Электрика",
  heating: "Отопление",
  elevator: "Лифт",
  cleaning: "Уборка",
  territory: "Территория",
  intercom_doors: "Домофон и двери",
  other: "Прочее",
};

export const requestLocationLabels: Record<RequestLocation, string> = {
  apartment: "Квартира",
  entrance: "Подъезд",
  floor: "Этаж",
  yard: "Двор",
  basement: "Подвал",
  roof: "Крыша",
  other: "Другое",
};

export const workLocationLabels: Record<WorkLocation, string> = {
  whole_house: "Весь дом",
  entrance: "Подъезд",
  yard: "Двор",
  basement: "Подвал",
  roof: "Крыша",
  other: "Другое",
};

export const priorityLabels: Record<Priority, string> = {
  urgent: "Срочный",
  normal: "Обычный",
  low: "Низкий",
};

export const requestStatusLabels: Record<RequestStatus, string> = {
  new: "Новая",
  in_progress: "В работе",
  done: "Выполнена",
  rejected: "Отклонена",
  cancelled: "Отменена",
};

export const workTypeLabels: Record<WorkType, string> = {
  planned: "Плановая",
  unplanned: "Внеплановая",
};

export const workStatusLabels: Record<WorkStatus, string> = {
  planned: "Запланирована",
  in_progress: "В работе",
  done: "Выполнена",
  rescheduled: "Перенесена",
  cancelled: "Отменена",
};

export const importanceLabels: Record<Importance, string> = {
  normal: "Обычное",
  important: "Важное",
};

/** Подпись вычисляемой отметки просрочки (ФТ-15.4, ФТ-16.7) */
export const OVERDUE_LABEL = "Просрочена";

/** Варианты для <select>: [значение, подпись] в порядке объявления */
export function toOptions<K extends string>(
  labels: Record<K, string>,
): Array<{ value: K; label: string }> {
  return (Object.entries(labels) as Array<[K, string]>).map(([value, label]) => ({
    value,
    label,
  }));
}
