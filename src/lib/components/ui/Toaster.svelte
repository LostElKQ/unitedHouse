<!--
  @component
  Контейнер всплывающих уведомлений. Подключён один раз в корневом
  +layout.svelte; уведомления вызываются через `toast` из toast.svelte.ts.
-->
<script lang="ts">
  import { CircleAlert, CircleCheck, Info, X } from "@lucide/svelte";
  import { toast, type ToastKind } from "./toast.svelte.ts";

  const styles: Record<ToastKind, string> = {
    success: "border-success-fg/30 bg-success-bg text-success-fg",
    error: "border-danger-fg/30 bg-danger-bg text-danger-fg",
    info: "border-line bg-surface text-ink",
  };
</script>

<!-- Над нижним меню жителя на телефоне, справа сверху на компьютере -->
<div
  class="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex flex-col items-center gap-2 px-4 md:top-4 md:right-4 md:bottom-auto md:left-auto md:items-end"
  aria-live="polite"
  role="status"
>
  {#each toast.items as item (item.id)}
    <div
      class={[
        "pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg border px-4 py-3 shadow-lg",
        styles[item.kind],
      ]}
    >
      {#if item.kind === "success"}
        <CircleCheck class="mt-0.5 size-5 shrink-0" aria-hidden="true" />
      {:else if item.kind === "error"}
        <CircleAlert class="mt-0.5 size-5 shrink-0" aria-hidden="true" />
      {:else}
        <Info class="mt-0.5 size-5 shrink-0" aria-hidden="true" />
      {/if}
      <p class="flex-1">{item.text}</p>
      <button
        class="-m-1 rounded p-1 opacity-70 hover:opacity-100"
        aria-label="Закрыть уведомление"
        onclick={() => toast.dismiss(item.id)}
        type="button"
      >
        <X class="size-4" aria-hidden="true" />
      </button>
    </div>
  {/each}
</div>
