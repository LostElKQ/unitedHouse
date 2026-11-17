import type { LayoutServerLoad } from './$types';

// В браузер отдаём только то, что нужно шапке
export const load: LayoutServerLoad = ({ locals }) => ({
	user: locals.user
		? { name: locals.user.name, role: locals.user.role, status: locals.user.status }
		: null
});
