import { fail, redirect } from '@sveltejs/kit';
import { APIError } from 'better-auth/api';
import { auth } from '#lib/server/auth.js';
import { db } from '#lib/server/db/index.js';
import { hoaSettings } from '#lib/server/db/schema.js';
import { homeFor, safeRedirect } from '#lib/roles.js';
import type { Actions, PageServerLoad } from './$types';

async function boardPhone() {
	const [s] = await db.select({ phone: hoaSettings.boardPhone }).from(hoaSettings).limit(1);
	return s?.phone ?? null;
}

const REASONS: Record<string, string> = {
	blocked: 'Учётная запись заблокирована. Обратитесь в правление ТСЖ',
	rejected: 'Регистрация отклонена. Обратитесь в правление ТСЖ'
};

export const load: PageServerLoad = async ({ url }) => {
	const reason = url.searchParams.get('reason');
	return {
		boardPhone: await boardPhone(),
		notice: reason ? (REASONS[reason] ?? null) : null
	};
};

export const actions = {
	default: async ({ request, url }) => {
		const form = await request.formData();
		const email = String(form.get('email') ?? '').trim();
		const password = String(form.get('password') ?? '');

		if (!email || !password) {
			return fail(400, { email, message: 'Введите email и пароль', contact: false });
		}

		let user;
		try {
			// ФТ-2.1: Better Auth проверяет email и пароль и ставит cookie сессии
			const res = await auth.api.signInEmail({
				body: { email, password },
				headers: request.headers
			});
			user = res.user;
		} catch (e) {
			if (!(e instanceof APIError)) throw e;
			// ФТ-2.3: 5 неудачных попыток → блокировка на 15 минут
			if (e.statusCode === 429) {
				return fail(429, { email, message: e.message, contact: false });
			}
			// ФТ-2.5: отклонён / заблокирован — сообщение и контакт правления
			if (e.statusCode === 403) {
				return fail(403, { email, message: e.message, contact: true });
			}
			// ФТ-2.2: одно общее сообщение, без указания, какое поле неверно
			return fail(400, { email, message: 'Неверный email или пароль', contact: false });
		}

		// ФТ-2.4: перенаправление по роли (или туда, куда пользователь шёл до входа)
		const home = homeFor(user);
		const back = safeRedirect(url.searchParams.get('redirectTo'));
		redirect(303, back && !['/change-password', '/pending'].includes(home) ? back : home);
	}
} satisfies Actions;
