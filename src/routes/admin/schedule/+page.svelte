<!--
  3.16 Планирование работ по дому (ФТ-16.1–16.8).
-->
<script lang="ts">
  import { invalidate } from "$app/navigation";
  import { Plus } from "@lucide/svelte";
  import { api, ApiError, type FieldErrors, type Paginated } from "#lib/api/client.js";
  import type { OpenRequest, UserRow, WorkDetail, WorkItem } from "#lib/api/types.js";
  import CompleteWorkModal from "#lib/components/schedule/CompleteWorkModal.svelte";
  import ScheduleView from "#lib/components/schedule/ScheduleView.svelte";
  import WorkDetailView from "#lib/components/schedule/WorkDetailView.svelte";
  import WorkForm from "#lib/components/schedule/WorkForm.svelte";
  import Button from "#lib/components/ui/Button.svelte";
  import ConfirmDialog from "#lib/components/ui/ConfirmDialog.svelte";
  import Field from "#lib/components/ui/Field.svelte";
  import Modal from "#lib/components/ui/Modal.svelte";
  import PageHeader from "#lib/components/ui/PageHeader.svelte";
  import { inputClass } from "#lib/components/ui/styles.js";
  import { toast } from "#lib/components/ui/toast.svelte.js";
  import { addDays, formatDate } from "#lib/format.js";
  import { copyWorkSchema, rescheduleSchema } from "#lib/schemas.js";
  import { validate } from "#lib/validation.js";
  import type { PageProps } from "./$types";

  let { data }: PageProps = $props();

  let s = $derived(data.schedule);
  let tz = $derived(data.hoa.timezone);

  function fail(e: unknown): FieldErrors {
    if (e instanceof ApiError) {
      if (Object.keys(e.fieldErrors).length === 0) toast.error(e.userMessage);
      return e.fieldErrors;
    }
    toast.error("Нет связи с сервером");
    return {};
  }

  async function refresh(id?: number): Promise<void> {
    await invalidate("app:works");
    if (id && detailOpen) detail = await api.get<WorkDetail>(`/api/works/${id}`);
  }

  // --- карточка ---------------------------------------------------------

  let detail: WorkDetail | null = $state(null);
  let detailOpen = $state(false);

  async function show(w: WorkItem): Promise<void> {
    try {
      detail = await api.get<WorkDetail>(`/api/works/${w.id}`);
      detailOpen = true;
    } catch (e) {
      fail(e);
    }
  }

  const OPEN_STATUSES: Array<WorkDetail["status"]> = ["planned", "rescheduled", "in_progress"];
  let isOpen = $derived(
    OPEN_STATUSES.includes((detail as WorkDetail | null)?.status ?? "cancelled"),
  );

  // --- создание и изменение ----------------------------------------------

  let formOpen = $state(false);
  let editing: WorkDetail | null = $state(null);
  let executors: UserRow[] = $state([]);
  let openRequests: OpenRequest[] = $state([]);
  let formKey = $state(0);
  let formBusy = $state(false);

  async function openForm(w: WorkDetail | null): Promise<void> {
    try {
      const [ex, rq] = await Promise.all([
        api.get<Paginated<UserRow>>("/api/users", {
          query: { role: "executor", status: "active", pageSize: 40 },
        }),
        api.get<OpenRequest[]>("/api/requests/open"),
      ]);
      executors = ex.data;
      openRequests = rq;
    } catch (e) {
      fail(e);
      return;
    }
    editing = w;
    formKey++;
    detailOpen = false;
    formOpen = true;
  }

  async function saveWork(values: Record<string, string>): Promise<FieldErrors | void> {
    formBusy = true;
    try {
      if (editing) {
        await api.patch(`/api/works/${editing.id}`, values);
        toast.success("Работа сохранена");
      } else {
        await api.post("/api/works", values);
        toast.success(`Работа добавлена на ${formatDate(values["workDate"] ?? "")}`);
      }
      formOpen = false;
      await refresh();
    } catch (e) {
      return fail(e);
    } finally {
      formBusy = false;
    }
  }

  // --- простые действия ---------------------------------------------------

  async function act(path: string, success: string): Promise<void> {
    if (!detail) return;
    try {
      await api.post(`/api/works/${detail.id}/${path}`);
      toast.success(success);
      await refresh(detail.id);
    } catch (e) {
      fail(e);
    }
  }

  let confirmCancel = $state(false);
  let confirmDelete = $state(false);

  async function remove(): Promise<void> {
    if (!detail) return;
    try {
      await api.delete(`/api/works/${detail.id}`);
      toast.success("Работа удалена");
      detailOpen = false;
      await refresh();
    } catch (e) {
      fail(e);
    }
  }

  // --- выполнено (ФТ-16.5) -----------------------------------------------

  let doneOpen = $state(false);

  // --- перенос (ФТ-16.3) --------------------------------------------------

  let moveOpen = $state(false);
  let move = $state({ newDate: "", reason: "" });
  let moveErrors: FieldErrors = $state({});
  let moveBusy = $state(false);

  function openMove(): void {
    move = { newDate: detail ? addDays(detail.workDate, 1) : s.today, reason: "" };
    moveErrors = {};
    moveOpen = true;
  }

  async function submitMove(e: SubmitEvent): Promise<void> {
    e.preventDefault();
    if (!detail) return;
    const v = validate(rescheduleSchema, move);
    if (!v.ok) {
      moveErrors = v.errors;
      return;
    }
    moveBusy = true;
    try {
      await api.post(`/api/works/${detail.id}/reschedule`, v.data);
      toast.success(`Работа перенесена на ${formatDate(v.data.newDate)}`);
      moveOpen = false;
      await refresh(detail.id);
    } catch (err) {
      moveErrors = fail(err);
    } finally {
      moveBusy = false;
    }
  }

  // --- копирование (ФТ-16.6) ------------------------------------------------

  let copyOpen = $state(false);
  let copyDate = $state("");
  let copyErrors: FieldErrors = $state({});
  let copyBusy = $state(false);

  function openCopy(): void {
    copyDate = detail ? addDays(detail.workDate, 7) : s.today;
    copyErrors = {};
    copyOpen = true;
  }

  async function submitCopy(e: SubmitEvent): Promise<void> {
    e.preventDefault();
    if (!detail) return;
    const v = validate(copyWorkSchema, { date: copyDate });
    if (!v.ok) {
      copyErrors = v.errors;
      return;
    }
    copyBusy = true;
    try {
      await api.post(`/api/works/${detail.id}/copy`, v.data);
      toast.success(`Копия создана на ${formatDate(v.data.date)}`);
      copyOpen = false;
      await refresh();
    } catch (err) {
      copyErrors = fail(err);
    } finally {
      copyBusy = false;
    }
  }
</script>

<PageHeader description="Плановые и внеплановые работы по дому" title="График работ">
  {#snippet actions()}
    <Button onclick={() => openForm(null)}>
      <Plus class="size-5" aria-hidden="true" />
      Добавить работу
    </Button>
  {/snippet}
</PageHeader>

<ScheduleView data={s} onopen={show} route="/admin/schedule" />

<Modal title={detail?.title ?? "Работа"} bind:open={detailOpen}>
  {#if detail}
    <WorkDetailView {tz} work={detail}>
      {#snippet actions()}
        {#if detail && isOpen}
          {#if detail.status !== "in_progress"}
            <Button onclick={() => act("start", "Работа начата")} size="sm">Начать</Button>
          {/if}
          <Button onclick={() => (doneOpen = true)} size="sm">Выполнено</Button>
          <Button onclick={() => openForm(detail)} size="sm" variant="secondary">Изменить</Button>
          <Button onclick={openMove} size="sm" variant="secondary">Перенести</Button>
        {/if}
        <Button onclick={openCopy} size="sm" variant="secondary">Копировать</Button>
        {#if detail?.status === "planned"}
          <Button onclick={() => (confirmDelete = true)} size="sm" variant="ghost">Удалить</Button>
        {:else if isOpen}
          <Button onclick={() => (confirmCancel = true)} size="sm" variant="ghost">Отменить</Button>
        {/if}
      {/snippet}
    </WorkDetailView>
  {/if}
</Modal>

<Modal busy={formBusy} title={editing ? "Изменить работу" : "Новая работа"} bind:open={formOpen}>
  {#key formKey}
    <WorkForm
      id="work-form"
      date={s.view === "day" ? s.date : s.today}
      entrances={s.settings.entrances}
      {executors}
      initial={editing}
      onsave={saveWork}
      requests={openRequests}
    />
  {/key}
  {#snippet footer()}
    <Button disabled={formBusy} onclick={() => (formOpen = false)} variant="secondary"
      >Отмена</Button
    >
    <Button form="work-form" loading={formBusy} type="submit"
      >{editing ? "Сохранить" : "Добавить"}</Button
    >
  {/snippet}
</Modal>

<CompleteWorkModal
  ondone={() => refresh(detail?.id)}
  today={s.today}
  work={detail}
  bind:open={doneOpen}
/>

<Modal busy={moveBusy} title="Перенести работу" bind:open={moveOpen}>
  <form id="move-form" class="flex flex-col gap-3" novalidate onsubmit={submitMove}>
    {#if detail}<p class="text-muted">Сейчас: {formatDate(detail.workDate)}</p>{/if}
    <Field error={moveErrors["newDate"]} label="Новая дата" required>
      {#snippet children(attrs)}
        <input {...attrs} class={inputClass} type="date" bind:value={move.newDate} />
      {/snippet}
    </Field>
    <Field
      error={moveErrors["reason"]}
      hint="Жители увидят её в карточке работы"
      label="Причина переноса"
      required
    >
      {#snippet children(attrs)}
        <textarea {...attrs} class={inputClass} maxlength="500" rows="2" bind:value={move.reason}
        ></textarea>
      {/snippet}
    </Field>
  </form>
  {#snippet footer()}
    <Button disabled={moveBusy} onclick={() => (moveOpen = false)} variant="secondary"
      >Отмена</Button
    >
    <Button form="move-form" loading={moveBusy} type="submit">Перенести</Button>
  {/snippet}
</Modal>

<Modal busy={copyBusy} title="Копировать работу" bind:open={copyOpen}>
  <form id="copy-form" class="flex flex-col gap-3" novalidate onsubmit={submitCopy}>
    <p class="text-muted">Будет создана такая же работа в статусе «Запланирована».</p>
    <Field error={copyErrors["date"]} label="Дата копии" required>
      {#snippet children(attrs)}
        <input {...attrs} class={inputClass} type="date" bind:value={copyDate} />
      {/snippet}
    </Field>
  </form>
  {#snippet footer()}
    <Button disabled={copyBusy} onclick={() => (copyOpen = false)} variant="secondary"
      >Отмена</Button
    >
    <Button form="copy-form" loading={copyBusy} type="submit">Копировать</Button>
  {/snippet}
</Modal>

<ConfirmDialog
  cancelLabel="Не отменять"
  confirmLabel="Отменить работу"
  danger
  message="Работа получит статус «Отменена» и останется в графике."
  onconfirm={() => act("cancel", "Работа отменена")}
  title="Отменить работу?"
  bind:open={confirmCancel}
/>
<ConfirmDialog
  confirmLabel="Удалить"
  danger
  message="Запланированная работа будет удалена из графика."
  onconfirm={remove}
  title="Удалить работу?"
  bind:open={confirmDelete}
/>
