<script lang="ts" module>
  function num(v: string): string {
    return formatVolume(v).replace(" м³", "");
  }
</script>

<!--
  «Показания и начисления» администратора.
  3.8 период: открыть → закрыть приём → сформировать → опубликовать
  3.10 таблица показаний, «Нет показаний», ввод за жителя
  3.11 формирование, предпросмотр, пересчёт, публикация
-->
<script lang="ts">
  import { goto, invalidate } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { Check, FileText, PencilLine, TriangleAlert } from "@lucide/svelte";
  import { api, ApiError, type FieldErrors } from "#lib/api/client.js";
  import type { ReadingRow } from "#lib/api/types.js";
  import ReadingForm from "#lib/components/readings/ReadingForm.svelte";
  import Badge from "#lib/components/ui/Badge.svelte";
  import Button from "#lib/components/ui/Button.svelte";
  import Card from "#lib/components/ui/Card.svelte";
  import ConfirmDialog from "#lib/components/ui/ConfirmDialog.svelte";
  import EmptyState from "#lib/components/ui/EmptyState.svelte";
  import Field from "#lib/components/ui/Field.svelte";
  import Modal from "#lib/components/ui/Modal.svelte";
  import PageHeader from "#lib/components/ui/PageHeader.svelte";
  import StatusBadge from "#lib/components/ui/StatusBadge.svelte";
  import {
    checkboxClass,
    inputClass,
    mobileListClass,
    tableClass,
    tdClass,
    thClass,
  } from "#lib/components/ui/styles.js";
  import Tabs from "#lib/components/ui/Tabs.svelte";
  import { toast } from "#lib/components/ui/toast.svelte.js";
  import {
    formatDate,
    formatDateTime,
    formatMoney,
    formatPeriod,
    formatVolume,
    todayIso,
  } from "#lib/format.js";
  import { periodStatusLabels, type PeriodStatus } from "#lib/labels.js";
  import { periodSchema } from "#lib/schemas.js";
  import { validate } from "#lib/validation.js";
  import type { PageProps } from "./$types";

  let { data }: PageProps = $props();

  let tz = $derived(data.hoa.timezone);
  let today = $derived(todayIso(tz));
  let period = $derived(data.period);
  let rows = $derived(data.readings?.rows ?? []);
  let missing = $derived(rows.filter((r) => r.cold === null));
  let editable = $derived(
    period?.status === "readings_open" || period?.status === "readings_closed",
  );

  const steps: PeriodStatus[] = ["readings_open", "readings_closed", "charges_formed", "published"];

  function href(params: Record<string, string | number>): ReturnType<typeof resolve> {
    return resolve(
      `/admin/billing?${new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)]))}`,
    );
  }

  // --- открытие периода (ФТ-8.1) ---------------------------------------

  function nextMonth(): { year: number; month: number } {
    const last = data.periods[0];
    if (!last) {
      const [y, m] = today.split("-").map(Number) as [number, number];
      return { year: y, month: m };
    }
    return last.month === 12
      ? { year: last.year + 1, month: 1 }
      : { year: last.year, month: last.month + 1 };
  }

  function dayOf(year: number, month: number, day: number): string {
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  let openForm = $state({ year: 0, month: 0, readingsStart: "", readingsEnd: "" });
  let openErrors: FieldErrors = $state({});
  let openBusy = $state(false);

  $effect(() => {
    const nm = nextMonth();
    openForm = {
      year: nm.year,
      month: nm.month,
      readingsStart: dayOf(nm.year, nm.month, data.settings.readingsStartDay),
      readingsEnd: dayOf(nm.year, nm.month, data.settings.readingsEndDay),
    };
  });

  async function openPeriod(e: SubmitEvent): Promise<void> {
    e.preventDefault();
    const v = validate(periodSchema, openForm);
    if (!v.ok) {
      openErrors = v.errors;
      return;
    }
    openBusy = true;
    try {
      const created = await api.post<{ id: number }>("/api/periods", v.data);
      toast.success(
        `Приём показаний за ${formatPeriod(v.data.year, v.data.month).toLowerCase()} открыт`,
      );
      await goto(href({ period: created.id }), { invalidateAll: true });
    } catch (err) {
      if (err instanceof ApiError) {
        openErrors = err.fieldErrors;
        if (Object.keys(err.fieldErrors).length === 0) toast.error(err.userMessage);
      }
    } finally {
      openBusy = false;
    }
  }

  // --- шаги периода -----------------------------------------------------

  let stepBusy = $state(false);

  async function step(path: string, success: string, switchTab?: "charges"): Promise<void> {
    if (!period) return;
    stepBusy = true;
    try {
      await api.post(`/api/periods/${period.id}/${path}`);
      toast.success(success);
      if (switchTab)
        await goto(href({ period: period.id, tab: switchTab }), { invalidateAll: true });
      else await invalidate("app:billing");
    } catch (err) {
      const msg = err instanceof ApiError ? err.userMessage : "Не удалось выполнить действие";
      toast.error(msg);
      if (msg.startsWith("Нет показаний")) {
        onlyMissing = true;
        await goto(href({ period: period.id, tab: "readings" }));
      }
    } finally {
      stepBusy = false;
    }
  }

  let confirmClose = $state(false);
  let confirmRecalc = $state(false);
  let confirmPublish = $state(false);

  // --- показания ----------------------------------------------------------

  let onlyMissing = $state(false);
  let visibleRows = $derived(onlyMissing ? missing : rows);

  let editRow: ReadingRow | null = $state(null);
  let editOpen = $state(false);

  function openEdit(r: ReadingRow): void {
    editRow = r;
    editOpen = true;
  }

  async function saveReading(values: { cold: string; hot: string }): Promise<FieldErrors | void> {
    if (!period || !editRow) return;
    try {
      await api.put(`/api/periods/${period.id}/readings/${editRow.apartmentId}`, values);
      toast.success(`Показания кв. ${editRow.apartmentNumber} сохранены`);
      editOpen = false;
      await invalidate("app:billing");
    } catch (err) {
      if (err instanceof ApiError) {
        if (Object.keys(err.fieldErrors).length === 0) toast.error(err.userMessage);
        return err.fieldErrors;
      }
    }
  }
</script>

<PageHeader
  description="Расчётный период, показания счётчиков и квитанции"
  title="Показания и начисления"
>
  {#snippet actions()}
    {#if data.periods.length > 1}
      <form class="flex items-center gap-2" method="GET">
        <label class="text-sm text-muted" for="period-select">Период</label>
        <select
          id="period-select"
          name="period"
          class={[inputClass, "w-auto"]}
          onchange={(e) => e.currentTarget.form?.requestSubmit()}
          value={String(period?.id ?? "")}
        >
          {#each data.periods as p (p.id)}
            <option value={String(p.id)}>{formatPeriod(p.year, p.month)}</option>
          {/each}
        </select>
        <noscript><Button type="submit" variant="secondary">Показать</Button></noscript>
      </form>
    {/if}
  {/snippet}
</PageHeader>

{#if !data.current}
  <Card class="mb-6" title="Открыть приём показаний">
    <form
      class="grid gap-4 sm:grid-cols-[auto_auto_1fr_1fr_auto] sm:items-end"
      novalidate
      onsubmit={openPeriod}
    >
      <Field error={openErrors["month"]} label="Месяц" required>
        {#snippet children(attrs)}
          <select {...attrs} class={inputClass} bind:value={openForm.month}>
            {#each Array.from({ length: 12 }, (_, i) => i + 1) as m (m)}
              <option value={m}>{formatPeriod(2000, m).replace(" 2000", "")}</option>
            {/each}
          </select>
        {/snippet}
      </Field>
      <Field error={openErrors["year"]} label="Год" required>
        {#snippet children(attrs)}
          <input
            {...attrs}
            class={[inputClass, "w-24"]}
            inputmode="numeric"
            bind:value={openForm.year}
          />
        {/snippet}
      </Field>
      <Field error={openErrors["readingsStart"]} label="Приём с" required>
        {#snippet children(attrs)}
          <input {...attrs} class={inputClass} type="date" bind:value={openForm.readingsStart} />
        {/snippet}
      </Field>
      <Field error={openErrors["readingsEnd"]} label="Приём по" required>
        {#snippet children(attrs)}
          <input {...attrs} class={inputClass} type="date" bind:value={openForm.readingsEnd} />
        {/snippet}
      </Field>
      <Button loading={openBusy} type="submit">Открыть период</Button>
    </form>
    <p class="mt-3 text-sm text-muted">
      Даты по умолчанию — из настроек ТСЖ. Жители смогут передавать показания, пока вы не закроете
      приём.
    </p>
  </Card>
{/if}

{#if !period}
  <Card><EmptyState text="Расчётных периодов ещё не было. Откройте первый приём показаний" /></Card>
{:else}
  <Card class="mb-6">
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h2 class="text-xl font-medium">{formatPeriod(period.year, period.month)}</h2>
        <p class="mt-1 text-muted">
          Приём показаний: {formatDate(period.readingsStart)} — {formatDate(period.readingsEnd)}
        </p>
      </div>
      <StatusBadge kind="period" value={period.status} />
    </div>

    <!-- Этапы периода -->
    <ol class="mt-4 grid gap-2 sm:grid-cols-4">
      {#each steps as s, i (s)}
        {@const done = steps.indexOf(period.status) > i}
        {@const active = period.status === s}
        <li
          class={[
            "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm",
            active ? "border-graphite font-medium" : "border-line",
            done ? "text-success-fg" : active ? "text-ink" : "text-muted",
          ]}
          aria-current={active ? "step" : undefined}
        >
          {#if done}<Check class="size-4 shrink-0" aria-hidden="true" />{:else}<span
              class="w-4 text-center">{i + 1}</span
            >{/if}
          {periodStatusLabels[s]}
        </li>
      {/each}
    </ol>

    {#if period.status === "readings_open" && today > period.readingsEnd}
      <div class="mt-4 flex gap-3 rounded-lg bg-warning-bg px-4 py-3 text-warning-fg" role="alert">
        <TriangleAlert class="mt-0.5 size-5 shrink-0" aria-hidden="true" />
        <p>
          Срок приёма показаний закончился {formatDate(period.readingsEnd)}. Закройте приём, чтобы
          сформировать начисления.
        </p>
      </div>
    {/if}

    <div class="mt-4 flex flex-wrap items-center gap-3">
      {#if period.status === "readings_open"}
        <Button loading={stepBusy} onclick={() => (confirmClose = true)}
          >Закрыть приём показаний</Button
        >
      {:else if period.status === "readings_closed"}
        <Button
          loading={stepBusy}
          onclick={() => step("charges", "Начисления сформированы", "charges")}
        >
          Сформировать начисления
        </Button>
      {:else if period.status === "charges_formed"}
        <Button loading={stepBusy} onclick={() => (confirmPublish = true)}
          >Опубликовать квитанции</Button
        >
        <Button disabled={stepBusy} onclick={() => (confirmRecalc = true)} variant="secondary"
          >Пересчитать</Button
        >
      {:else}
        <p class="text-muted">
          Квитанции опубликованы{period.publishedAt
            ? ` ${formatDate(period.publishedAt, tz)}`
            : ""}. Показания и начисления периода изменить нельзя.
        </p>
      {/if}
      {#if missing.length > 0 && period.status !== "published"}
        <Badge tone="warning">Нет показаний: {missing.length}</Badge>
      {/if}
    </div>
  </Card>

  <Tabs
    label="Разделы периода"
    tabs={[
      {
        href: href({ period: period.id, tab: "readings" }),
        label: "Показания",
        active: data.tab === "readings",
        count: missing.length,
      },
      {
        href: href({ period: period.id, tab: "charges" }),
        label: "Начисления",
        active: data.tab === "charges",
      },
    ]}
  />

  {#if data.tab === "readings"}
    <Card class="p-4 sm:px-6" padded={false}>
      <label class="mb-3 flex items-center gap-2">
        <input class={checkboxClass} type="checkbox" bind:checked={onlyMissing} />
        Только квартиры с отметкой «Нет показаний»
      </label>

      {#if visibleRows.length === 0}
        <EmptyState text={onlyMissing ? "Показания переданы по всем квартирам" : "Квартир нет"} />
      {:else}
        <table class={tableClass}>
          <thead>
            <tr>
              <th class={thClass} rowspan="2">Кв.</th>
              <th class={[thClass, "text-center"]} colspan="3">ХВС, м³</th>
              <th class={[thClass, "text-center"]} colspan="3">ГВС, м³</th>
              <th class={thClass} rowspan="2">Кем и когда внесены</th>
              <th class={thClass} rowspan="2"><span class="sr-only">Действия</span></th>
            </tr>
            <tr>
              <th class={[thClass, "text-right"]}>пред.</th>
              <th class={[thClass, "text-right"]}>тек.</th>
              <th class={[thClass, "text-right"]}>расход</th>
              <th class={[thClass, "text-right"]}>пред.</th>
              <th class={[thClass, "text-right"]}>тек.</th>
              <th class={[thClass, "text-right"]}>расход</th>
            </tr>
          </thead>
          <tbody class="tabular-nums">
            {#each visibleRows as r (r.apartmentId)}
              <tr>
                <td class={[tdClass, "font-medium"]}>{r.apartmentNumber}</td>
                <td class={[tdClass, "text-right text-muted"]}>{num(r.prevCold)}</td>
                <td class={[tdClass, "text-right"]}>{r.cold ? num(r.cold) : "—"}</td>
                <td class={[tdClass, "text-right"]}>{r.coldUsage ? num(r.coldUsage) : "—"}</td>
                <td class={[tdClass, "text-right text-muted"]}>{num(r.prevHot)}</td>
                <td class={[tdClass, "text-right"]}>{r.hot ? num(r.hot) : "—"}</td>
                <td class={[tdClass, "text-right"]}>{r.hotUsage ? num(r.hotUsage) : "—"}</td>
                <td class={[tdClass, "text-sm"]}>{@render who(r)}</td>
                <td class={[tdClass, "text-right"]}>{@render editButton(r)}</td>
              </tr>
            {/each}
          </tbody>
          {#if !onlyMissing && data.readings}
            <tfoot>
              <tr class="font-medium">
                <td class={tdClass} colspan="3">Итого расход по дому</td>
                <td class={[tdClass, "text-right"]}>{num(data.readings.totals.cold)}</td>
                <td class={tdClass} colspan="2"></td>
                <td class={[tdClass, "text-right"]}>{num(data.readings.totals.hot)}</td>
                <td class={tdClass} colspan="2"></td>
              </tr>
            </tfoot>
          {/if}
        </table>

        <ul class={mobileListClass}>
          {#each visibleRows as r (r.apartmentId)}
            <li class="flex flex-col gap-1 py-3">
              <div class="flex items-center justify-between gap-2">
                <p class="font-medium">Квартира {r.apartmentNumber}</p>
                {@render editButton(r)}
              </div>
              {#if r.cold}
                <p class="text-sm">ХВС {num(r.cold)} (расход {num(r.coldUsage ?? "0")})</p>
                <p class="text-sm">ГВС {num(r.hot ?? "0")} (расход {num(r.hotUsage ?? "0")})</p>
              {/if}
              <div class="text-sm">{@render who(r)}</div>
            </li>
          {/each}
        </ul>
      {/if}
    </Card>
  {:else}
    <Card class="p-4 sm:px-6" padded={false}>
      {#if !data.charges}
        <EmptyState
          text="Начисления ещё не сформированы. Закройте приём показаний и нажмите «Сформировать начисления»"
        />
      {:else}
        <table class={tableClass}>
          <thead>
            <tr>
              <th class={thClass}>Кв.</th>
              <th class={thClass}>Лицевой счёт</th>
              <th class={[thClass, "text-right"]}>Начислено</th>
              <th class={[thClass, "text-right"]}>Оплачено</th>
              <th class={thClass}>Статус оплаты</th>
              <th class={thClass}><span class="sr-only">Квитанция</span></th>
            </tr>
          </thead>
          <tbody class="tabular-nums">
            {#each data.charges.rows as c (c.chargeId)}
              <tr>
                <td class={[tdClass, "font-medium"]}>{c.apartmentNumber}</td>
                <td class={[tdClass, "font-mono text-sm"]}>{c.accountNumber}</td>
                <td class={[tdClass, "text-right whitespace-nowrap"]}>{formatMoney(c.total)}</td>
                <td class={[tdClass, "text-right whitespace-nowrap"]}
                  >{formatMoney(c.paidAmount)}</td
                >
                <td class={tdClass}><StatusBadge kind="payment" value={c.paymentStatus} /></td>
                <td class={[tdClass, "text-right"]}>
                  <Button
                    href={resolve("/admin/receipts/[id]", { id: String(c.chargeId) })}
                    size="sm"
                    variant="ghost"
                  >
                    <FileText class="size-4" aria-hidden="true" />
                    Квитанция
                  </Button>
                </td>
              </tr>
            {/each}
          </tbody>
          <tfoot>
            <tr class="font-medium">
              <td class={tdClass} colspan="2">Итого по дому</td>
              <td class={[tdClass, "text-right whitespace-nowrap"]}
                >{formatMoney(data.charges.total)}</td
              >
              <td class={tdClass} colspan="3"></td>
            </tr>
          </tfoot>
        </table>

        <ul class={mobileListClass}>
          {#each data.charges.rows as c (c.chargeId)}
            <li>
              <a
                class="flex items-center justify-between gap-3 py-3"
                href={resolve("/admin/receipts/[id]", { id: String(c.chargeId) })}
              >
                <span>
                  <span class="font-medium">Квартира {c.apartmentNumber}</span><br />
                  <span class="text-sm text-muted">ЛС {c.accountNumber}</span>
                </span>
                <span class="text-right">
                  <span class="font-medium">{formatMoney(c.total)}</span><br />
                  <StatusBadge kind="payment" value={c.paymentStatus} />
                </span>
              </a>
            </li>
          {/each}
          <li class="flex justify-between py-3 font-medium">
            <span>Итого по дому</span><span>{formatMoney(data.charges.total)}</span>
          </li>
        </ul>

        <h3 class="mt-6 mb-2 font-medium">По услугам</h3>
        <dl class="grid max-w-md grid-cols-[1fr_auto] gap-x-6 gap-y-1">
          {#each data.charges.byService as s (s.service)}
            <dt class="text-muted">{s.service}</dt>
            <dd class="text-right tabular-nums">{formatMoney(s.amount)}</dd>
          {/each}
        </dl>
      {/if}
    </Card>
  {/if}
{/if}

{#snippet who(r: ReadingRow)}
  {#if r.cold === null}
    <Badge tone="warning">Нет показаний</Badge>
  {:else}
    {r.enteredByName ?? "—"}{r.enteredAt ? `, ${formatDateTime(r.enteredAt, tz)}` : ""}
    {#if r.enteredByAdmin}<br /><span class="text-muted">Внесено администратором</span>{/if}
  {/if}
{/snippet}

{#snippet editButton(r: ReadingRow)}
  {#if editable}
    <Button onclick={() => openEdit(r)} size="sm" variant={r.cold === null ? "secondary" : "ghost"}>
      <PencilLine class="size-4" aria-hidden="true" />
      {r.cold === null ? "Внести" : "Исправить"}
    </Button>
  {/if}
{/snippet}

<Modal
  title={editRow ? `Показания кв. ${editRow.apartmentNumber}` : "Показания"}
  bind:open={editOpen}
>
  {#if editRow && editOpen}
    <ReadingForm
      id="admin-reading"
      hideSubmit
      initial={editRow.cold && editRow.hot ? { cold: editRow.cold, hot: editRow.hot } : null}
      onsave={saveReading}
      prev={{ cold: editRow.prevCold, hot: editRow.prevHot }}
    />
    <p class="mt-3 text-sm text-muted">Показания будут отмечены «Внесено администратором».</p>
  {/if}
  {#snippet footer()}
    <Button onclick={() => (editOpen = false)} variant="secondary">Отмена</Button>
    <Button form="admin-reading" type="submit">Сохранить</Button>
  {/snippet}
</Modal>

<ConfirmDialog
  confirmLabel="Закрыть приём"
  message="Жители больше не смогут передавать и исправлять показания за этот период. Администратор сможет внести их вручную."
  onconfirm={() => step("close", "Приём показаний закрыт")}
  title="Закрыть приём показаний?"
  bind:open={confirmClose}
/>
<ConfirmDialog
  confirmLabel="Пересчитать"
  message="Предыдущий расчёт будет заменён новым — по текущим тарифам, площадям и показаниям."
  onconfirm={() => step("charges", "Начисления пересчитаны", "charges")}
  title="Пересчитать начисления?"
  bind:open={confirmRecalc}
/>
<ConfirmDialog
  confirmLabel="Опубликовать"
  message={period
    ? `Жители увидят квитанции за ${formatPeriod(period.year, period.month).toLowerCase()}. После публикации показания и начисления периода изменить нельзя.`
    : ""}
  onconfirm={() => step("publish", "Квитанции опубликованы")}
  title="Опубликовать квитанции?"
  bind:open={confirmPublish}
/>
