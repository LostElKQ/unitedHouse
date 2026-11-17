<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	let pending = $state(false);
</script>

<svelte:head><title>Вход — Единый дом</title></svelte:head>

<div class="card">
	<h1>Вход</h1>
	<p class="lead">Личный кабинет жителя и правления ТСЖ</p>

	{#if form?.message}
		<div class="alert alert-error" role="alert">
			{form.message}
			{#if form.contact && data.boardPhone}
				<br />Телефон правления: <a href="tel:{data.boardPhone}">{data.boardPhone}</a>
			{/if}
		</div>
	{:else if data.notice}
		<div class="alert alert-error" role="alert">
			{data.notice}
			{#if data.boardPhone}<br />Телефон правления: <a href="tel:{data.boardPhone}">{data.boardPhone}</a>{/if}
		</div>
	{/if}

	<form
		method="POST"
		use:enhance={() => {
			pending = true;
			return async ({ update }) => {
				await update({ reset: false });
				pending = false;
			};
		}}
	>
		<div class="field">
			<label for="email">Email <span class="req" aria-hidden="true">*</span></label>
			<input id="email" name="email" type="email" autocomplete="username" required value={form?.email ?? ''} />
		</div>

		<div class="field">
			<label for="password">Пароль <span class="req" aria-hidden="true">*</span></label>
			<input id="password" name="password" type="password" autocomplete="current-password" required />
		</div>

		<button class="btn btn-primary btn-block" type="submit" disabled={pending}>
			{pending ? 'Входим…' : 'Войти'}
		</button>
	</form>

	<p class="below">Нет учётной записи? <a href="/register">Регистрация</a></p>
</div>
