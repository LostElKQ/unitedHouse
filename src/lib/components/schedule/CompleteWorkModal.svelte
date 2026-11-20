<!--
  @component
  Отметка «Выполнено» (ФТ-16.5, ФТ-18.4): комментарий и фактическая дата
  обязательны, до 5 фото «после» — в том числе с камеры телефона.
-->
<script lang="ts">
  import { api, ApiError, type FieldErrors } from "#lib/api/client.js";
  import type { WorkDetail } from "#lib/api/types.js";
  import Button from "#lib/components/ui/Button.svelte";
  import Field from "#lib/components/ui/Field.svelte";
  import Modal from "#lib/components/ui/Modal.svelte";
  import PhotoPicker from "#lib/components/ui/PhotoPicker.svelte";
  import { inputClass } from "#lib/components/ui/styles.js";
  import { toast } from "#lib/components/ui/toast.svelte.js";
  import { completeWorkSchema } from "#lib/schemas.js";
  import { validate } from "#lib/validation.js";

  type Props = {
    open: boolean;
    work: WorkDetail | null;
    today: string;
    ondone: () => void | Promise<void>;
  };

  let { open = $bindable(), work, today, ondone }: Props = $props();

  let report = $state("");
  let completedOn = $state("");
  let photos: File[] = $state([]);
  let errors: FieldErrors = $state({});
  let busy = $state(false);

  $effect(() => {
    if (open) {
      report = "";
      completedOn = today;
      photos = [];
      errors = {};
    }
  });

  async function submit(e: SubmitEvent): Promise<void> {
    e.preventDefault();
    if (!work) return;
    const v = validate(completeWorkSchema, { report, completedOn });
    if (!v.ok) {
      errors = v.errors;
      return;
    }
    if (completedOn > today) {
      errors = { completedOn: ["Дата не может быть позже сегодняшней"] };
      return;
    }
    const body = new FormData();
    body.set("report", report);
    body.set("completedOn", completedOn);
    for (const f of photos) body.append("photos", f);
    busy = true;
    try {
      await api.post(`/api/works/${work.id}/complete`, body);
      toast.success("Работа отмечена выполненной");
      open = false;
      await ondone();
    } catch (err) {
      if (err instanceof ApiError) {
        errors = err.fieldErrors;
        if (Object.keys(err.fieldErrors).length === 0) toast.error(err.userMessage);
      } else toast.error("Нет связи с сервером");
    } finally {
      busy = false;
    }
  }
</script>

<Modal {busy} title="Отметить выполнение" bind:open>
  <form id="done-form" class="flex flex-col gap-3" novalidate onsubmit={submit}>
    {#if work}<p class="font-medium">{work.title}</p>{/if}
    <Field error={errors["report"]} label="Что сделано" required>
      {#snippet children(attrs)}
        <textarea {...attrs} class={inputClass} maxlength="2000" rows="3" bind:value={report}
        ></textarea>
      {/snippet}
    </Field>
    <Field error={errors["completedOn"]} label="Фактическая дата выполнения" required>
      {#snippet children(attrs)}
        <input {...attrs} class={inputClass} max={today} type="date" bind:value={completedOn} />
      {/snippet}
    </Field>
    <PhotoPicker
      error={errors["photos"]}
      label="Фото «после» (необязательно)"
      max={5}
      bind:files={photos}
    />
  </form>
  {#snippet footer()}
    <Button disabled={busy} onclick={() => (open = false)} variant="secondary">Отмена</Button>
    <Button form="done-form" loading={busy} type="submit">Выполнено</Button>
  {/snippet}
</Modal>
