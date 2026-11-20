<!-- ФТ-14.7, 14.8: список своих заявок со статусами, отмена новой заявки -->
<script lang="ts">
  import { invalidate } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { CalendarDays, Plus } from "@lucide/svelte";
  import { api, ApiError } from "#lib/api/client.js";
  import type { RequestItem } from "#lib/api/types.js";
  import Badge from "#lib/components/ui/Badge.svelte";
  import Button from "#lib/components/ui/Button.svelte";
  import Card from "#lib/components/ui/Card.svelte";
  import ConfirmDialog from "#lib/components/ui/ConfirmDialog.svelte";
  import EmptyState from "#lib/components/ui/EmptyState.svelte";
  import PageHeader from "#lib/components/ui/PageHeader.svelte";
  import StatusBadge from "#lib/components/ui/StatusBadge.svelte";
  import { toast } from "#lib/components/ui/toast.svelte.js";
  import { formatDate, formatDateTime } from "#lib/format.js";
  import { categoryLabels, requestLocationLabels } from "#lib/labels.js";
  import type { PageProps } from "./$types";

  let { data }: PageProps = $props();
  let tz = $derived(data.hoa.timezone);

  let cancelling: RequestItem | null = $state(null);
  let cancelOpen = $state(false);

  async function cancel(): Promise<void> {
    if (!cancelling) return;
    try {
      await api.post(`/api/my/requests/${cancelling.id}/cancel`);
      toast.success(`Заявка №${cancelling.number} отменена`);
      await invalidate("app:my-requests");
    } catch (e) {
      toast.error(e instanceof ApiError ? e.userMessage : "Не удалось отменить");
    }
  }
</script>

<PageHeader title="Заявки">
  {#snippet actions()}
    <Button href={resolve("/(resident)/requests/new")}>
      <Plus class="size-5" aria-hidden="true" />
      Новая заявка
    </Button>
  {/snippet}
</PageHeader>

{#if data.requests.length === 0}
  <Card
    ><EmptyState
      text="Заявок пока нет. Сообщите о неисправности в доме — нажмите «Новая заявка»"
    /></Card
  >
{:else}
  <ul class="flex flex-col gap-3">
    {#each data.requests as r (r.id)}
      <li>
        <Card>
          <div class="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p class="font-medium">№{r.number} · {categoryLabels[r.category]}</p>
              <p class="text-sm text-muted">
                {formatDateTime(r.createdAt, tz)} · {requestLocationLabels[
                  r.location
                ]}{r.locationDetail ? `, ${r.locationDetail}` : ""}
              </p>
            </div>
            <div class="flex flex-wrap gap-2">
              {#if r.priority === "urgent"}<Badge tone="danger">Срочно</Badge>{/if}
              <StatusBadge kind="request" value={r.status} />
            </div>
          </div>
          <p class="mt-3 whitespace-pre-line">{r.description}</p>
          {#if r.photos.length}
            <div class="mt-3 flex flex-wrap gap-2">
              {#each r.photos as ph, i (ph.id)}
                <a href={ph.url} rel="external" target="_blank">
                  <img
                    class="size-20 rounded-lg border border-line object-cover"
                    alt="Фото к заявке №{r.number}, {i + 1}"
                    loading="lazy"
                    src={ph.url}
                  />
                </a>
              {/each}
            </div>
          {/if}
          {#if r.plannedDate && (r.status === "new" || r.status === "in_progress")}
            <p class="mt-3 flex items-center gap-2 text-sm">
              <CalendarDays class="size-4" aria-hidden="true" />
              Работа запланирована на {formatDate(r.plannedDate)}
            </p>
          {/if}
          {#if r.status === "new"}
            <div class="mt-3">
              <Button
                onclick={() => {
                  cancelling = r;
                  cancelOpen = true;
                }}
                size="sm"
                variant="ghost"
              >
                Отменить заявку
              </Button>
            </div>
          {/if}
        </Card>
      </li>
    {/each}
  </ul>
{/if}

<ConfirmDialog
  cancelLabel="Не отменять"
  confirmLabel="Отменить заявку"
  danger
  message={`Заявка №${cancelling?.number ?? ""} будет отменена.`}
  onconfirm={cancel}
  title="Отменить заявку?"
  bind:open={cancelOpen}
/>
