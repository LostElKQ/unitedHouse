<!--
  @component
  Подтверждение необратимого действия (СТ 5.1, 6.4 Тр. 2): публикация
  квитанций, удаление, отмена отметки оплаты.
  Пока onconfirm выполняется, кнопки заблокированы; если он бросит
  ошибку, окно останется открытым.

  ```svelte
  <ConfirmDialog
    bind:open={confirmPublish}
    title="Опубликовать квитанции?"
    message="После публикации показания и начисления октября изменить нельзя."
    confirmLabel="Опубликовать"
    onconfirm={publish}
  />
  ```
-->
<script lang="ts">
  import Button from "./Button.svelte";
  import Modal from "./Modal.svelte";

  type Props = {
    open: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    /** Красная кнопка для удаления */
    danger?: boolean;
    onconfirm: () => void | Promise<void>;
  };

  let {
    open = $bindable(),
    title,
    message,
    confirmLabel = "Подтвердить",
    cancelLabel = "Отмена",
    danger = false,
    onconfirm,
  }: Props = $props();

  let busy = $state(false);

  async function confirm(): Promise<void> {
    busy = true;
    try {
      await onconfirm();
      open = false;
    } finally {
      busy = false;
    }
  }
</script>

<Modal {busy} {title} bind:open>
  <p>{message}</p>

  {#snippet footer()}
    <Button disabled={busy} onclick={() => (open = false)} variant="secondary">
      {cancelLabel}
    </Button>
    <Button loading={busy} onclick={confirm} variant={danger ? "danger" : "primary"}>
      {confirmLabel}
    </Button>
  {/snippet}
</Modal>
