<!-- ФТ-12.1: квитанции по месяцам — период, сумма, срок оплаты, статус оплаты -->
<script lang="ts">
  import { resolve } from "$app/paths";
  import { ChevronRight } from "@lucide/svelte";
  import Card from "#lib/components/ui/Card.svelte";
  import EmptyState from "#lib/components/ui/EmptyState.svelte";
  import PageHeader from "#lib/components/ui/PageHeader.svelte";
  import StatusBadge from "#lib/components/ui/StatusBadge.svelte";
  import { formatDate, formatMoney, formatPeriod } from "#lib/format.js";
  import type { PageProps } from "./$types";

  let { data }: PageProps = $props();
</script>

<PageHeader title="Квитанции" />

<Card padded={false}>
  {#if data.receipts.length === 0}
    <EmptyState text="Квитанций пока нет. Они появятся после публикации правлением ТСЖ" />
  {:else}
    <ul class="divide-y divide-line">
      {#each data.receipts as r (r.id)}
        <li>
          <a
            class="flex items-center gap-4 px-4 py-4 hover:bg-page sm:px-6"
            href={resolve("/(resident)/receipts/[id]", { id: String(r.id) })}
          >
            <div class="min-w-0 flex-1">
              <p class="font-medium">{formatPeriod(r.year, r.month)}</p>
              <p class="text-sm text-muted">Оплатить до {formatDate(r.dueDate)}</p>
            </div>
            <div class="flex flex-col items-end gap-1">
              <p class="font-medium whitespace-nowrap">{formatMoney(r.total)}</p>
              <StatusBadge kind="payment" value={r.paymentStatus} />
            </div>
            <ChevronRight class="size-5 shrink-0 text-muted" aria-hidden="true" />
          </a>
        </li>
      {/each}
    </ul>
  {/if}
</Card>
