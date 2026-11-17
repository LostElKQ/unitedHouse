import { redirect } from '@sveltejs/kit';
import { auth } from '#lib/server/auth.js';
import type { Actions, PageServerLoad } from './$types';

// ФТ-2.6: выход. Только POST (кнопка в шапке), чтобы выход нельзя было вызвать ссылкой.
export const load: PageServerLoad = () => redirect(303, '/');

export const actions = {
	default: async ({ request }) => {
		await auth.api.signOut({ headers: request.headers });
		redirect(303, '/login');
	}
} satisfies Actions;
