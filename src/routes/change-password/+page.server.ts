import { fail, redirect } from '@sveltejs/kit';
import { APIError } from 'better-auth/api';
import { auth } from '#lib/server/auth.js';
import { homeFor } from '#lib/roles.js';
import { PASSWORD_RE } from '#lib/validation.js';
import type { Actions, PageServerLoad } from './$types';

// Смена пароля. Обязательна при первом входе с временным паролем (ФТ-4.7),
// обычная смена из профиля — та же страница (ФТ-22.2).
export const load: PageServerLoad = ({ locals }) => ({
	forced: Boolean(locals.user?.mustChangePassword)
});

export const actions = {
	default: async ({ request, locals }) => {
		const form = await request.formData();
		const currentPassword = String(form.get('currentPassword') ?? '');
		const newPassword = String(form.get('newPassword') ?? '');
		const newPassword2 = String(form.get('newPassword2') ?? '');

		const errors: Record<string, string> = {};
		if (!currentPassword) errors.currentPassword = 'Введите текущий пароль';
		if (!PASSWORD_RE.test(newPassword)) errors.newPassword = 'Не менее 8 символов, хотя бы одна буква и одна цифра';
		else if (newPassword === currentPassword) errors.newPassword = 'Новый пароль должен отличаться от текущего';
		if (newPassword2 !== newPassword) errors.newPassword2 = 'Пароли не совпадают';
		if (Object.keys(errors).length) return fail(400, { errors });

		try {
			await auth.api.changePassword({
				body: { currentPassword, newPassword, revokeOtherSessions: true },
				headers: request.headers
			});
		} catch (e) {
			if (!(e instanceof APIError)) throw e;
			const wrongCurrent = e.statusCode === 400 || e.statusCode === 401;
			return fail(400, {
				errors: wrongCurrent ? { currentPassword: 'Текущий пароль введён неверно' } : { form: e.message }
			});
		}

		// флаг mustChangePassword снимается в auth.ts (hook после /change-password)
		redirect(303, homeFor({ ...locals.user, mustChangePassword: false }));
	}
} satisfies Actions;
