// Проверки полей регистрации и входа (ФТ-1.1–1.5, словарь данных СТ).
// Один и тот же код работает в браузере (подсказки при вводе) и на сервере (окончательная проверка, п. 5.1 СТ).

export const PHONE_RE = /^\+7 \(\d{3}\) \d{3}-\d{2}-\d{2}$/;
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const NAME_RE = /^[\p{L}][\p{L} -]*$/u; // буквы, пробел, дефис
export const PASSWORD_RE = /^(?=.*\p{L})(?=.*\d).{8,}$/u;

export type RegisterValues = {
	name: string;
	email: string;
	phone: string;
	apartment: string;
	password: string;
	password2: string;
	consent: boolean;
};

export type RegisterErrors = Partial<Record<keyof RegisterValues, string>>;

/** Маска телефона: из любого ввода делает «+7 (XXX) XXX-XX-XX» (ФТ-1.3). */
export function formatPhone(input: string): string {
	let digits = input.replace(/\D/g, '');
	if (digits.startsWith('8') || digits.startsWith('7')) digits = digits.slice(1);
	digits = digits.slice(0, 10);
	if (!digits) return '';
	let out = '+7 (' + digits.slice(0, 3);
	if (digits.length >= 3) out += ')';
	if (digits.length > 3) out += ' ' + digits.slice(3, 6);
	if (digits.length > 6) out += '-' + digits.slice(6, 8);
	if (digits.length > 8) out += '-' + digits.slice(8, 10);
	return out;
}

export function validateRegister(v: RegisterValues): RegisterErrors {
	const e: RegisterErrors = {};
	const name = v.name.trim();
	const email = v.email.trim();
	const apartment = v.apartment.trim();

	// ФТ-1.1: обязательны все поля, кроме телефона
	if (!name) e.name = 'Укажите ФИО';
	else if (name.length > 150) e.name = 'Не длиннее 150 символов';
	else if (!NAME_RE.test(name)) e.name = 'Только буквы, пробел и дефис';

	// ФТ-1.2: формат (уникальность проверяет сервер)
	if (!email) e.email = 'Укажите email';
	else if (email.length > 254 || !EMAIL_RE.test(email)) e.email = 'Введите email в формате name@domain.ru';

	// ФТ-1.3: телефон необязателен, но если указан — в формате +7 (XXX) XXX-XX-XX
	if (v.phone.trim() && !PHONE_RE.test(v.phone.trim())) e.phone = 'Введите номер полностью: +7 (XXX) XXX-XX-XX';

	// ФТ-1.4: существование квартиры проверяет сервер
	if (!apartment) e.apartment = 'Укажите номер квартиры';
	else if (apartment.length > 10) e.apartment = 'Не длиннее 10 символов';

	// ФТ-1.5
	if (!v.password) e.password = 'Придумайте пароль';
	else if (!PASSWORD_RE.test(v.password)) e.password = 'Не менее 8 символов, хотя бы одна буква и одна цифра';
	else if (v.password.length > 128) e.password = 'Не длиннее 128 символов';

	if (!v.password2) e.password2 = 'Повторите пароль';
	else if (v.password && v.password2 !== v.password) e.password2 = 'Пароли не совпадают';

	// ФТ-1.6
	if (!v.consent) e.consent = 'Нужно согласие на обработку персональных данных';

	return e;
}
