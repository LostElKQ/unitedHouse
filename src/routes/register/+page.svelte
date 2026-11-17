<script lang="ts">
	import { untrack } from 'svelte';
	import { enhance } from '$app/forms';
	import { formatPhone, validateRegister, type RegisterValues } from '#lib/validation.js';
	import type { PageProps } from './$types';

	let { form }: PageProps = $props();

	type Field = keyof RegisterValues;

	// Начальные значения: после отправки без JavaScript сервер возвращает введённое (кроме паролей)
	const initial = untrack(() => form?.values);
	let values = $state<RegisterValues>({
		name: initial?.name ?? '', email: initial?.email ?? '', phone: initial?.phone ?? '',
		apartment: initial?.apartment ?? '', password: '', password2: '', consent: initial?.consent ?? false
	});
	let touched = $state<Partial<Record<Field, boolean>>>({});
	let submitted = $state(false);
	let pending = $state(false);

	// Подсказки при вводе — те же правила, что на сервере
	const clientErrors = $derived(validateRegister(values));

	/** Текст ошибки у поля: своя проверка (после ухода с поля или попытки отправить)
	 *  или ответ сервера (занятый email, нет квартиры), пока значение не поменяли. */
	function error(k: Field): string | undefined {
		const fromServer = form?.errors?.[k];
		const sentValue = (form?.values as Record<string, unknown> | undefined)?.[k];
		if (fromServer && (k === 'password' || k === 'password2' || sentValue === values[k])) return fromServer;
		if (touched[k] || submitted) return clientErrors[k];
		return undefined;
	}

	const touch = (k: Field) => () => (touched[k] = true);

	function onPhoneInput(e: Event) {
		const input = e.currentTarget as HTMLInputElement;
		values.phone = formatPhone(input.value);
		input.value = values.phone;
	}
</script>

<svelte:head><title>Регистрация — Единый дом</title></svelte:head>

<div class="card">
	<h1>Регистрация</h1>
	<p class="lead">После регистрации правление ТСЖ проверит, что вы живёте в указанной квартире.</p>

	{#if form?.message}<div class="alert alert-error" role="alert">{form.message}</div>{/if}

	<form
		method="POST"
		novalidate
		use:enhance={({ cancel }) => {
			submitted = true;
			if (Object.keys(clientErrors).length) {
				cancel(); // ошибки уже подсвечены у полей
				document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
				return;
			}
			pending = true;
			return async ({ update }) => {
				await update({ reset: false });
				pending = false;
			};
		}}
	>
		{#snippet err(k: Field)}
			{#if error(k)}<span class="error" id="{k}-err">{error(k)}</span>{/if}
		{/snippet}

		<div class="field">
			<label for="name">ФИО <span class="req" aria-hidden="true">*</span></label>
			<input id="name" name="name" type="text" autocomplete="name" maxlength="150"
				placeholder="Иванов Иван Иванович"
				bind:value={values.name} onblur={touch('name')}
				aria-invalid={error('name') ? 'true' : undefined} aria-describedby="name-err" />
			{@render err('name')}
		</div>

		<div class="field">
			<label for="email">Email <span class="req" aria-hidden="true">*</span></label>
			<input id="email" name="email" type="email" autocomplete="email" maxlength="254"
				bind:value={values.email} onblur={touch('email')}
				aria-invalid={error('email') ? 'true' : undefined} aria-describedby="email-err" />
			{#if error('email')}{@render err('email')}{:else}<span class="hint">Будет логином для входа</span>{/if}
		</div>

		<div class="field">
			<label for="phone">Телефон</label>
			<input id="phone" name="phone" type="tel" autocomplete="tel" inputmode="numeric"
				placeholder="+7 (___) ___-__-__"
				value={values.phone} oninput={onPhoneInput} onblur={touch('phone')}
				aria-invalid={error('phone') ? 'true' : undefined} aria-describedby="phone-err" />
			{@render err('phone')}
		</div>

		<div class="field">
			<label for="apartment">Номер квартиры <span class="req" aria-hidden="true">*</span></label>
			<input id="apartment" name="apartment" type="text" maxlength="10" placeholder="Например, 12 или 12а"
				bind:value={values.apartment} onblur={touch('apartment')}
				aria-invalid={error('apartment') ? 'true' : undefined} aria-describedby="apartment-err" />
			{@render err('apartment')}
		</div>

		<div class="field">
			<label for="password">Пароль <span class="req" aria-hidden="true">*</span></label>
			<input id="password" name="password" type="password" autocomplete="new-password"
				bind:value={values.password} onblur={touch('password')}
				aria-invalid={error('password') ? 'true' : undefined} aria-describedby="password-err" />
			{#if error('password')}{@render err('password')}{:else}<span class="hint" id="password-err">Не менее 8 символов, буква и цифра</span>{/if}
		</div>

		<div class="field">
			<label for="password2">Повтор пароля <span class="req" aria-hidden="true">*</span></label>
			<input id="password2" name="password2" type="password" autocomplete="new-password"
				bind:value={values.password2} onblur={touch('password2')}
				aria-invalid={error('password2') ? 'true' : undefined} aria-describedby="password2-err" />
			{@render err('password2')}
		</div>

		<div class="field">
			<label class="check">
				<input name="consent" type="checkbox" bind:checked={values.consent} />
				<span>Я согласен(а) на обработку персональных данных в соответствии с 152-ФЗ <span class="req" aria-hidden="true">*</span></span>
			</label>
		</div>

		<!-- ФТ-1.6: без согласия кнопка неактивна -->
		<button class="btn btn-primary btn-block" type="submit" disabled={!values.consent || pending}>
			{pending ? 'Отправляем…' : 'Зарегистрироваться'}
		</button>
	</form>

	<p class="below">Уже есть учётная запись? <a href="/login">Войти</a></p>
</div>
