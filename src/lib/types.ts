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
};
