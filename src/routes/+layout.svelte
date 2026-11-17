<script lang="ts">
	import favicon from '#lib/assets/favicon.svg';
	import { ROLE_LABELS, type Role } from '#lib/roles.js';
	import type { LayoutProps } from './$types';
	import '../app.css';

	let { data, children }: LayoutProps = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>Единый дом</title>
</svelte:head>

<header class="topbar">
	<span class="brand">Единый дом</span>
	{#if data.user}
		<div class="who">
			<span class="who-name">{data.user.name}</span>
			<span class="who-role">{ROLE_LABELS[data.user.role as Role] ?? ''}</span>
			<!-- ФТ-2.6: кнопка «Выйти» -->
			<form method="POST" action="/logout">
				<button class="btn btn-on-dark" type="submit">Выйти</button>
			</form>
		</div>
	{/if}
</header>

<main>
	{@render children()}
</main>
