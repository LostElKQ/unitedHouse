<!--
  @component
  Переключение страниц списка. Ссылки на соседние страницы строит
  родитель, чтобы сохранить остальные параметры поиска.
-->
<script lang="ts">
  import type { ResolvedPathname } from "$app/types";
  import { ChevronLeft, ChevronRight } from "@lucide/svelte";

  type Props = {
    page: number;
    totalPages: number;
    total: number;
    prevHref: ResolvedPathname;
    nextHref: ResolvedPathname;
  };

  let { page, totalPages, total, prevHref, nextHref }: Props = $props();

  const linkClass =
    "inline-flex min-h-10 items-center gap-1 rounded-lg border border-line bg-surface px-3 hover:bg-page";
</script>

{#if totalPages > 1}
  <nav class="mt-4 flex items-center justify-between gap-3" aria-label="Страницы">
    <p class="text-sm text-muted">Страница {page} из {totalPages} · всего {total}</p>
    <div class="flex gap-2">
      {#if page > 1}
        <a class={linkClass} href={prevHref} rel="prev">
          <ChevronLeft class="size-4" aria-hidden="true" /> Назад
        </a>
      {/if}
      {#if page < totalPages}
        <a class={linkClass} href={nextHref} rel="next">
          Вперёд <ChevronRight class="size-4" aria-hidden="true" />
        </a>
      {/if}
    </div>
  </nav>
{/if}
