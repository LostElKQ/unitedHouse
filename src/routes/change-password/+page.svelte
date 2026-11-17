<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const err = (k: string) => (form?.errors as Record<string, string> | undefined)?.[k];
</script>

<svelte:head><title>Смена пароля — Единый дом</title></svelte:head>

<div class="card">
	<h1>Смена пароля</h1>
	{#if data.forced}
		<p class="lead">Вы вошли с временным паролем. Придумайте свой, чтобы продолжить.</p>
	{/if}

	{#if err('form')}<div class="alert alert-error" role="alert">{err('form')}</div>{/if}

	<form method="POST" use:enhance novalidate>
		<div class="field">
			<label for="currentPassword">{data.forced ? 'Временный пароль' : 'Текущий пароль'} <span class="req" aria-hidden="true">*</span></label>
			<input id="currentPassword" name="currentPassword" type="password" autocomplete="current-password"
				aria-invalid={err('currentPassword') ? 'true' : undefined} aria-describedby="currentPassword-err" />
			{#if err('currentPassword')}<span class="error" id="currentPassword-err">{err('currentPassword')}</span>{/if}
		</div>
		<div class="field">
			<label for="newPassword">Новый пароль <span class="req" aria-hidden="true">*</span></label>
			<input id="newPassword" name="newPassword" type="password" autocomplete="new-password"
				aria-invalid={err('newPassword') ? 'true' : undefined} aria-describedby="newPassword-hint" />
			{#if err('newPassword')}
				<span class="error" id="newPassword-hint">{err('newPassword')}</span>
			{:else}
				<span class="hint" id="newPassword-hint">Не менее 8 символов, буква и цифра</span>
			{/if}
		</div>
		<div class="field">
			<label for="newPassword2">Повтор нового пароля <span class="req" aria-hidden="true">*</span></label>
			<input id="newPassword2" name="newPassword2" type="password" autocomplete="new-password"
				aria-invalid={err('newPassword2') ? 'true' : undefined} aria-describedby="newPassword2-err" />
			{#if err('newPassword2')}<span class="error" id="newPassword2-err">{err('newPassword2')}</span>{/if}
		</div>
		<button class="btn btn-primary btn-block" type="submit">Сохранить пароль</button>
	</form>
</div>
