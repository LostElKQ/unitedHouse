<!--
  @component
  Модальное окно на нативном <dialog>: фокус внутри окна, закрытие по Esc
  и возврат фокуса браузер делает сам.

  ```svelte
  <Modal bind:open title="Отклонить регистрацию">
    …форма…
    {#snippet footer()}
      <Button variant="secondary" onclick={() => (open = false)}>Отмена</Button>
      <Button>Отклонить</Button>
    {/snippet}
  </Modal>
  ```
-->
<script lang="ts">
  import type { Snippet } from "svelte";
  import { X } from "@lucide/svelte";

  type Props = {
    open: boolean;
    title: string;
    /** Нельзя закрыть крестиком/Esc, пока идёт запрос */
    busy?: boolean;
    onclose?: () => void;
    children: Snippet;
    footer?: Snippet;
  };

  let { open = $bindable(), title, busy = false, onclose, children, footer }: Props = $props();

  let dialog: HTMLDialogElement | undefined = $state();
  const titleId = $props.id();

  $effect(() => {
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  });

  function close(): void {
    if (busy) return;
    open = false;
    onclose?.();
  }
</script>

<dialog
  bind:this={dialog}
  class="m-auto w-[calc(100%-2rem)] max-w-lg rounded-xl border border-line bg-surface p-0 text-ink shadow-xl backdrop:bg-graphite/50"
  aria-labelledby={titleId}
  oncancel={(e) => {
    e.preventDefault();
    close();
  }}
>
  <div class="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
    <h2 id={titleId} class="text-lg font-medium">{title}</h2>
    <button
      class="-m-1 rounded-md p-1 text-muted hover:bg-page hover:text-ink"
      aria-label="Закрыть"
      disabled={busy}
      onclick={close}
      type="button"
    >
      <X class="size-5" aria-hidden="true" />
    </button>
  </div>

  <div class="px-5 py-4">{@render children()}</div>

  {#if footer}
    <div class="flex flex-wrap justify-end gap-2 border-t border-line px-5 py-4">
      {@render footer()}
    </div>
  {/if}
</dialog>
