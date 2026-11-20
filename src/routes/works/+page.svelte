<!--
  3.18 «Мои работы» исполнителя — минимальная версия: свои работы
  (ФТ-18.1), карточка (ФТ-18.2), крупные «Начать» и «Выполнено»
  (ФТ-18.3, 18.4, 18.6). Полная версия — во второй версии MVP.
-->
<script lang="ts">
  import { invalidate } from "$app/navigation";
  import { api, ApiError } from "#lib/api/client.js";
  import type { WorkDetail, WorkItem } from "#lib/api/types.js";
  import CompleteWorkModal from "#lib/components/schedule/CompleteWorkModal.svelte";
  import ScheduleView from "#lib/components/schedule/ScheduleView.svelte";
  import WorkDetailView from "#lib/components/schedule/WorkDetailView.svelte";
  import Button from "#lib/components/ui/Button.svelte";
  import Modal from "#lib/components/ui/Modal.svelte";
  import PageHeader from "#lib/components/ui/PageHeader.svelte";
  import { toast } from "#lib/components/ui/toast.svelte.js";
  import type { PageProps } from "./$types";

  let { data }: PageProps = $props();

  let detail: WorkDetail | null = $state(null);
  let detailOpen = $state(false);
  let doneOpen = $state(false);
  let busy = $state(false);

  async function show(w: WorkItem): Promise<void> {
    try {
      detail = await api.get<WorkDetail>(`/api/works/${w.id}`);
      detailOpen = true;
    } catch (e) {
      toast.error(e instanceof ApiError ? e.userMessage : "Не удалось открыть работу");
    }
  }

  async function refresh(): Promise<void> {
    await invalidate("app:works");
    if (detail) detail = await api.get<WorkDetail>(`/api/works/${detail.id}`);
  }

  async function start(): Promise<void> {
    if (!detail) return;
    busy = true;
    try {
      await api.post(`/api/works/${detail.id}/start`);
      toast.success("Работа начата");
      await refresh();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.userMessage : "Не удалось начать");
    } finally {
      busy = false;
    }
  }

  let status = $derived((detail as WorkDetail | null)?.status);
  let canStart = $derived(status === "planned" || status === "rescheduled");
  let canFinish = $derived(canStart || status === "in_progress");
</script>

<PageHeader title="Мои работы" />

<ScheduleView data={data.schedule} onopen={show} route="/works" showFilters={false} />

<Modal title={detail?.title ?? "Работа"} bind:open={detailOpen}>
  {#if detail}
    <WorkDetailView tz={data.hoa.timezone} work={detail}>
      {#snippet actions()}
        {#if canStart}
          <Button block loading={busy} onclick={start} size="lg">Начать</Button>
        {/if}
        {#if canFinish}
          <Button
            block
            onclick={() => (doneOpen = true)}
            size="lg"
            variant={canStart ? "secondary" : "primary"}
          >
            Выполнено
          </Button>
        {/if}
      {/snippet}
    </WorkDetailView>
  {/if}
</Modal>

<CompleteWorkModal
  ondone={refresh}
  today={data.schedule.today}
  work={detail}
  bind:open={doneOpen}
/>
