<script lang="ts">
	import type { PageProps } from './$types';
	let { data }: PageProps = $props();
</script>

<svelte:head><title>Ожидает подтверждения — Единый дом</title></svelte:head>

<div class="card">
	<h1>Заявка на регистрацию в правлении</h1>
	<p>
		Правление ТСЖ проверит, что вы живёте в квартире{data.apartment ? ` № ${data.apartment}` : ''}, и подтвердит
		учётную запись. После этого вам станут доступны показания, квитанции, заявки и график работ.
	</p>
	<p class="lead">Обычно это занимает 1–2 дня. Обновите страницу позже или войдите снова.</p>
	{#if data.boardPhone}
		<p>Вопросы — по телефону правления: <a href="tel:{data.boardPhone}">{data.boardPhone}</a></p>
	{/if}
</div>
