<!--
  @component
  Вкладки-ссылки (состояние хранится в адресе страницы).
-->
<script lang="ts">
  import type { ResolvedPathname } from "$app/types";

  type Tab = { href: ResolvedPathname; label: string; active: boolean; count?: number };

  let { tabs, label }: { tabs: Tab[]; label: string } = $props();
</script>

<nav class="mb-4 flex gap-1 overflow-x-auto border-b border-line" aria-label={label}>
  {#each tabs as tab (tab.href)}
    <a
      class={[
        "-mb-px inline-flex min-h-11 items-center gap-2 border-b-2 px-3 whitespace-nowrap",
        tab.active
          ? "border-graphite font-medium text-ink"
          : "border-transparent text-muted hover:text-ink",
      ]}
      aria-current={tab.active ? "page" : undefined}
      href={tab.href}
    >
      {tab.label}
      {#if tab.count}
        <span class="rounded-full bg-warning-bg px-2 text-sm font-medium text-warning-fg">
          {tab.count}
        </span>
      {/if}
    </a>
  {/each}
</nav>
