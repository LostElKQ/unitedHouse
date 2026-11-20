<script lang="ts">
  import { resolve } from "$app/paths";
  import { ArrowLeft } from "@lucide/svelte";
  import ReceiptView from "#lib/components/receipts/ReceiptView.svelte";
  import Button from "#lib/components/ui/Button.svelte";
  import PageHeader from "#lib/components/ui/PageHeader.svelte";
  import { formatPeriod } from "#lib/format.js";
  import type { PageProps } from "./$types";

  let { data }: PageProps = $props();
</script>

<Button class="mb-3 -ml-3" href={resolve("/(resident)/receipts")} size="sm" variant="ghost">
  <ArrowLeft class="size-4" aria-hidden="true" /> Все квитанции
</Button>
<PageHeader
  title="Квитанция за {formatPeriod(data.receipt.year, data.receipt.month).toLowerCase()}"
/>
<ReceiptView receipt={data.receipt} />
