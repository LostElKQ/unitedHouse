import { redirect } from '@sveltejs/kit';
import { sequence, type Handle } from '@sveltejs/kit/hooks';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import { building } from '$app/env';
import { auth } from '#lib/server/auth.js';
import { homeFor } from '#lib/roles.js';

/** 1. Better Auth: сессия → event.locals, маршруты /api/auth/* */
const authHandle: Handle = async ({ event, resolve }) => {
	const session = await auth.api.getSession({ headers: event.request.headers });
	if (session) {
		event.locals.session = session.session;
		event.locals.user = session.user;
	}
	return svelteKitHandler({ event, resolve, auth, building });
};

// Страницы, доступные без входа
const PUBLIC = ['/login', '/register', '/register/sent'];
// Разделы по ролям (ФТ-2.4, п. 6.3 СТ: права проверяются на сервере при каждом запросе)
const AREAS: { prefix: string; role: string }[] = [
	{ prefix: '/admin', role: 'admin' },
	{ prefix: '/my-works', role: 'executor' }
];

const isUnder = (path: string, prefix: string) => path === prefix || path.startsWith(prefix + '/');

/** 2. Кого куда пускать */
const guardHandle: Handle = async ({ event, resolve }) => {
	const path = event.url.pathname;
	if (building || path.startsWith('/api/auth') || path.startsWith('/_app')) return resolve(event);

	const user = event.locals.user;
	const isPublic = PUBLIC.some((p) => isUnder(path, p));

	// Не вошёл → на страницу входа, с возвратом туда, куда шёл
	if (!user) {
		if (isPublic) return resolve(event);
		const back = path === '/' ? '' : `?redirectTo=${encodeURIComponent(path + event.url.search)}`;
		redirect(303, '/login' + back);
	}

	// Администратор заблокировал или отклонил пользователя, пока тот был в системе (ФТ-4.5)
	if (user.status === 'blocked' || user.status === 'rejected') {
		await auth.api.signOut({ headers: event.request.headers });
		event.locals.user = undefined;
		event.locals.session = undefined;
		redirect(303, `/login?reason=${user.status}`);
	}

	if (path === '/logout') return resolve(event);

	// Вошедшему нечего делать на входе и регистрации
	if (isPublic) redirect(303, homeFor(user));

	// Обязательная смена временного пароля (ФТ-4.7)
	if (user.mustChangePassword) {
		if (path !== '/change-password') redirect(303, '/change-password');
		return resolve(event);
	}
	if (path === '/change-password') return resolve(event);

	// «Ожидает подтверждения» видит только экран ожидания (ФТ-2.5)
	if (user.status === 'pending') {
		if (path !== '/pending') redirect(303, '/pending');
		return resolve(event);
	}
	if (path === '/pending') redirect(303, homeFor(user));

	// Разделы администратора и исполнителя; всё остальное — раздел жителя
	const area = AREAS.find((a) => isUnder(path, a.prefix));
	if (area ? user.role !== area.role : user.role !== 'resident') redirect(303, homeFor(user));

	return resolve(event);
};

export const handle = sequence(authHandle, guardHandle);
