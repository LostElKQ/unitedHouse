<!--
  3.17 Просмотр графика работ жителем (ФТ-17.1–17.5): только просмотр.
-->
<script lang="ts">
  import { api, ApiError } from "#lib/api/client.js";
  import type { WorkDetail, WorkItem } from "#lib/api/types.js";
  import ScheduleView from "#lib/components/schedule/ScheduleView.svelte";
  import WorkDetailView from "#lib/components/schedule/WorkDetailView.svelte";
  import Modal from "#lib/components/ui/Modal.svelte";
  import PageHeader from "#lib/components/ui/PageHeader.svelte";
  import { toast } from "#lib/components/ui/toast.svelte.js";
  import type { PageProps } from "./$types";

  let { data }: PageProps = $props();

  let detail: WorkDetail | null = $state(null);
  let open = $state(false);

  async function show(w: WorkItem): Promise<void> {
    try {
      detail = await api.get<WorkDetail>(`/api/works/${w.id}`);
      open = true;
    } catch (e) {
      toast.error(e instanceof ApiError ? e.userMessage : "Не удалось открыть карточку");
    }
  }
</script>

<PageHeader description="Плановые и внеплановые работы по дому" title="График работ" />

<ScheduleView
  data={data.schedule}
  myEntrance={data.user?.apartment?.entrance ?? null}
  onopen={show}
  route="/(resident)/schedule"
/>

<Modal title={detail?.title ?? "Работа"} bind:open>
  {#if detail}<WorkDetailView tz={data.hoa.timezone} work={detail} />{/if}
</Modal>
