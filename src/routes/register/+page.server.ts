import { fail, redirect } from '@sveltejs/kit';
import { APIError } from 'better-auth/api';
import { eq, sql } from 'drizzle-orm';
import { auth } from '#lib/server/auth.js';
import { db } from '#lib/server/db/index.js';
import { apartments, users } from '#lib/server/db/schema.js';
import { validateRegister, type RegisterErrors, type RegisterValues } from '#lib/validation.js';
import type { Actions } from './$types';

const EMAIL_TAKEN = 'Пользователь с таким email уже существует'; // ФТ-1.2
const NO_APARTMENT = 'Квартира с таким номером не найдена. Обратитесь в правление ТСЖ'; // ФТ-1.4

export const actions = {
	default: async ({ request }) => {
		const f = await request.formData();
		const v: RegisterValues = {
			name: String(f.get('name') ?? '').trim().replace(/\s+/g, ' '),
			email: String(f.get('email') ?? '').trim().toLowerCase(),
			phone: String(f.get('phone') ?? '').trim(),
			apartment: String(f.get('apartment') ?? '').trim(),
			password: String(f.get('password') ?? ''),
			password2: String(f.get('password2') ?? ''),
			consent: f.get('consent') === 'on'
		};
		// Возвращаем в форму ровно то, что ввёл человек (форма по этим значениям понимает,
		// к какому вводу относится ошибка сервера). Пароли обратно не отправляем.
		const raw = (k: string) => String(f.get(k) ?? '');
		const values = { name: raw('name'), email: raw('email'), phone: raw('phone'), apartment: raw('apartment'), consent: v.consent };
		const reject = (errors: RegisterErrors, message?: string) => fail(400, { values, errors, message });

		// Повторная проверка всех правил на сервере
		const errors = validateRegister(v);
		if (Object.keys(errors).length) return reject(errors);

		// ФТ-1.2: email уникален
		const [taken] = await db.select({ id: users.id }).from(users)
			.where(sql`lower(${users.email}) = ${v.email}`).limit(1);
		if (taken) return reject({ email: EMAIL_TAKEN });

		// ФТ-1.4: квартира есть в реестре
		const [apt] = await db.select({ id: apartments.id }).from(apartments)
			.where(eq(apartments.number, v.apartment)).limit(1);
		if (!apt) return reject({ apartment: NO_APARTMENT });

		try {
			// ФТ-1.7: Better Auth создаёт пользователя; в auth.ts ему принудительно ставятся
			// роль «Житель» и статус «Ожидает подтверждения». Вход после регистрации не выполняется.
			await auth.api.signUpEmail({
				body: {
					name: v.name,
					email: v.email,
					password: v.password,
					phone: v.phone || undefined,
					apartmentId: apt.id,
					pdConsentAt: new Date() // ФТ-1.6: дата и время согласия
				}
			});
		} catch (e) {
			if (!(e instanceof APIError)) throw e;
			if (e.body?.code === 'USER_ALREADY_EXISTS' || e.statusCode === 422) return reject({ email: EMAIL_TAKEN });
			return reject({}, e.message);
		}

		redirect(303, '/register/sent');
	}
} satisfies Actions;
