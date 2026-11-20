<!--
  @component
  Белая карточка с рамкой — основной контейнер для форм и блоков.
-->
<script lang="ts">
  import type { Snippet } from "svelte";

  type Props = {
    title?: string;
    /** Кнопки или ссылки справа от заголовка */
    actions?: Snippet;
    padded?: boolean;
    class?: string;
    children: Snippet;
  };

  let { title, actions, padded = true, class: className = "", children }: Props = $props();
</script>

<section class={["rounded-xl border border-line bg-surface", padded && "p-4 sm:p-6", className]}>
  {#if title || actions}
    <header class="mb-4 flex flex-wrap items-center justify-between gap-2">
      {#if title}<h2 class="text-lg font-medium">{title}</h2>{/if}
      {@render actions?.()}
    </header>
  {/if}
  {@render children()}
</section>
