<!--
  @component
  Квитанция на экране (ФТ-12.2): строки начислений, итог, срок оплаты,
  реквизиты ТСЖ для оплаты. Общая для жителя и администратора.
-->
<script lang="ts">
  import { Download } from "@lucide/svelte";
  import type { Receipt } from "#lib/api/types.js";
  import Badge from "#lib/components/ui/Badge.svelte";
  import Button from "#lib/components/ui/Button.svelte";
  import Card from "#lib/components/ui/Card.svelte";
  import StatusBadge from "#lib/components/ui/StatusBadge.svelte";
  import { formatArea, formatDate, formatMoney, formatNumber, formatPeriod } from "#lib/format.js";

  let { receipt: r }: { receipt: Receipt } = $props();

  const digits = (unit: string): number => (unit === "м³" ? 3 : unit === "м²" ? 2 : 0);
</script>

<div class="flex flex-col gap-6">
  <Card>
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p class="text-muted">Расчётный период</p>
        <h2 class="text-xl font-medium">{formatPeriod(r.year, r.month)}</h2>
      </div>
      <div class="flex flex-wrap gap-2">
        {#if !r.published}<Badge tone="warning">Черновик — жителю не видна</Badge>{/if}
        <StatusBadge kind="payment" value={r.paymentStatus} />
      </div>
    </div>

    <dl class="mt-4 grid gap-x-6 gap-y-1 sm:grid-cols-[auto_1fr]">
      <dt class="text-muted">Плательщик</dt>
      <dd>{r.payerNames.join(", ") || "—"}</dd>
      <dt class="text-muted">Квартира</dt>
      <dd>{r.apartment.number}, площадь {formatArea(r.apartment.area)}</dd>
      <dt class="text-muted">Лицевой счёт</dt>
      <dd class="font-mono">{r.apartment.accountNumber}</dd>
    </dl>

    <div class="mt-6 overflow-x-auto">
      <table class="w-full min-w-[32rem] border-collapse text-left tabular-nums">
        <thead>
          <tr class="border-b border-line text-sm text-muted">
            <th class="py-2 pr-3 font-medium">Услуга</th>
            <th class="px-3 py-2 text-right font-medium">Объём</th>
            <th class="px-3 py-2 font-medium">Ед.</th>
            <th class="px-3 py-2 text-right font-medium">Тариф</th>
            <th class="py-2 pl-3 text-right font-medium">Сумма</th>
          </tr>
        </thead>
        <tbody>
          {#each r.lines as l, i (i)}
            <tr class="border-b border-line">
              <td class="py-2 pr-3">{l.service}</td>
              <td class="px-3 py-2 text-right">{formatNumber(l.volume, digits(l.unit))}</td>
              <td class="px-3 py-2">{l.unit}</td>
              <td class="px-3 py-2 text-right">{formatNumber(l.rate, 2)}</td>
              <td class="py-2 pl-3 text-right whitespace-nowrap">{formatMoney(l.amount)}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <div class="mt-4 flex flex-col items-end gap-1">
      <p class="text-xl font-medium">Итого к оплате: {formatMoney(r.total)}</p>
      <p>Срок оплаты: до {formatDate(r.dueDate)}</p>
      {#if r.paymentStatus !== "unpaid"}
        <p class="text-muted">Оплачено: {formatMoney(r.paidAmount)}</p>
      {/if}
    </div>

    <div class="mt-6">
      <Button download href="/api/receipts/{r.id}/pdf" variant="secondary">
        <Download class="size-5" aria-hidden="true" />
        Скачать PDF
      </Button>
    </div>
  </Card>

  <Card title="Реквизиты для оплаты">
    <dl class="grid gap-x-6 gap-y-1 sm:grid-cols-[auto_1fr]">
      <dt class="text-muted">Получатель</dt>
      <dd>{r.hoa.name}</dd>
      {#if r.hoa.inn}<dt class="text-muted">ИНН / КПП</dt>
        <dd>{r.hoa.inn} / {r.hoa.kpp ?? "—"}</dd>{/if}
      {#if r.hoa.bankAccount}<dt class="text-muted">Расчётный счёт</dt>
        <dd class="font-mono">{r.hoa.bankAccount}</dd>{/if}
      {#if r.hoa.bankName}<dt class="text-muted">Банк</dt>
        <dd>{r.hoa.bankName}</dd>{/if}
      {#if r.hoa.bik}<dt class="text-muted">БИК</dt>
        <dd class="font-mono">{r.hoa.bik}</dd>{/if}
      {#if r.hoa.corrAccount}<dt class="text-muted">Корр. счёт</dt>
        <dd class="font-mono">{r.hoa.corrAccount}</dd>{/if}
    </dl>
    <p class="mt-3 text-sm text-muted">
      В назначении платежа укажите лицевой счёт {r.apartment.accountNumber} и период.
    </p>
  </Card>
</div>
