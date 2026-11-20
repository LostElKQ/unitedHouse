<!--
  @component
  Заголовок страницы с необязательным описанием и кнопками действий.
  Заодно задаёт <title> вкладки.
-->
<script lang="ts">
  import type { Snippet } from "svelte";

  type Props = { title: string; description?: string; actions?: Snippet };

  let { title, description, actions }: Props = $props();
</script>

<svelte:head>
  <title>{title} — Единый дом</title>
</svelte:head>

<header class="mb-6 flex flex-wrap items-end justify-between gap-3">
  <div>
    <h1 class="text-2xl font-medium sm:text-3xl">{title}</h1>
    {#if description}<p class="mt-1 text-muted">{description}</p>{/if}
  </div>
  {#if actions}
    <div class="flex flex-wrap gap-2">{@render actions()}</div>
  {/if}
</header>
