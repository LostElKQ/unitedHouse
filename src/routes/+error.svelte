<!-- Страница ошибки: 403, 404, 500 — по-русски и с выходом на главную -->
<script lang="ts">
  import { resolve } from "$app/paths";
  import { page } from "$app/state";
  import Button from "#lib/components/ui/Button.svelte";

  const titles: Partial<Record<number, string>> = {
    401: "Нужно войти в систему",
    403: "Нет доступа",
    404: "Страница не найдена",
  };

  let title = $derived(titles[page.status] ?? "Что-то пошло не так");
</script>

<svelte:head><title>{title} — Единый дом</title></svelte:head>

<main class="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
  <p class="font-heading text-6xl font-medium text-muted">{page.status}</p>
  <h1 class="text-2xl font-medium">{title}</h1>
  {#if page.status >= 500}
    <p class="text-muted">Попробуйте обновить страницу через минуту.</p>
  {/if}
  <Button href={resolve("/(resident)")}>На главную</Button>
</main>
