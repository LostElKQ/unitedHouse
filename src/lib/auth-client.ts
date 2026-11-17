// Клиент Better Auth для страниц Svelte:
//   authClient.signIn.email({ email, password })
//   authClient.signOut()
//   authClient.requestPasswordReset({ email, redirectTo: '/reset-password' })
//   authClient.changePassword({ currentPassword, newPassword, revokeOtherSessions: true })
// Регистрацию лучше делать через form action на сервере: там номер квартиры
// превращается в apartmentId и вызывается auth.api.signUpEmail (пример — в DB_README.md).
import { createAuthClient } from 'better-auth/svelte';
import { inferAdditionalFields } from 'better-auth/client/plugins';
import type { auth } from '#lib/server/auth.js';

export const authClient = createAuthClient({
	plugins: [inferAdditionalFields<typeof auth>()]
});
