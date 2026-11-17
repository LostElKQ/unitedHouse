// Роли, статусы и «домашние» страницы (ФТ-2.4). Можно импортировать и в браузере, и на сервере.

export type Role = 'resident' | 'admin' | 'executor';
export type UserStatus = 'pending' | 'active' | 'rejected' | 'blocked';

export const ROLE_LABELS: Record<Role, string> = {
	resident: 'Житель',
	admin: 'Администратор',
	executor: 'Исполнитель'
};

/** Главная страница по роли: житель → главная, администратор → панель, исполнитель → «Мои работы». */
export function homeFor(user: { role?: string | null; status?: string | null; mustChangePassword?: boolean | null }) {
	if (user.mustChangePassword) return '/change-password'; // ФТ-4.7
	if (user.status === 'pending') return '/pending'; // ФТ-2.5
	switch (user.role) {
		case 'admin':
			return '/admin';
		case 'executor':
			return '/my-works';
		default:
			return '/';
	}
}

/** Безопасный адрес возврата после входа: только внутренние пути. */
export function safeRedirect(target: string | null | undefined): string | null {
	if (!target || !target.startsWith('/') || target.startsWith('//') || target.startsWith('/\\')) return null;
	return target;
}
