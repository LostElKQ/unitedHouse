// Клиент Better Auth для браузера: вход, регистрация, выход, смена пароля.
// Запросы идут на /api/auth/* того же сервера (настроено в src/lib/server/auth.ts).
import { createAuthClient } from "better-auth/svelte";

export const authClient = createAuthClient();
