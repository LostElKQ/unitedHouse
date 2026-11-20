import type { UserRole, UserStatus } from "./labels.ts";

/** Текущий пользователь — приходит из корневого +layout.server.ts */
export type CurrentUser = {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  mustChangePassword: boolean;
  apartmentId: number | null;
  /** Квартира жителя: номер и подъезд (фильтр «Мой подъезд», ФТ-17.3) */
  apartment: { number: string; entrance: number } | null;
};
