<!--
  3.9 Передача показаний счётчиков жителем.
  ФТ-8.3 статус и даты приёма · 9.1 форма с расходом · 9.2 доступна только
  при открытом приёме · 9.3/9.4 проверки · 9.5 исправление до закрытия
  9.6 история по месяцам. СТ 6.1 Тр. 1: передать показания за 2 минуты.
-->
<script lang="ts">
  import { invalidate } from "$app/navigation";
  import { CircleCheck, Lock } from "@lucide/svelte";
  import { api, ApiError, type FieldErrors } from "#lib/api/client.js";
  import ReadingForm from "#lib/components/readings/ReadingForm.svelte";
  import Button from "#lib/components/ui/Button.svelte";
  import Card from "#lib/components/ui/Card.svelte";
  import EmptyState from "#lib/components/ui/EmptyState.svelte";
  import PageHeader from "#lib/components/ui/PageHeader.svelte";
  import StatusBadge from "#lib/components/ui/StatusBadge.svelte";
  import { mobileListClass, tableClass, tdClass, thClass } from "#lib/components/ui/styles.js";
  import { toast } from "#lib/components/ui/toast.svelte.js";
  import { formatDate, formatDateTime, formatPeriod, formatVolume } from "#lib/format.js";
  import type { PageProps } from "./$types";

  let { data }: PageProps = $props();

  let r = $derived(data.readings);
  let tz = $derived(data.hoa.timezone);
  let editing = $state(false);
  let formKey = $state(0);

  async function save(values: { cold: string; hot: string }): Promise<FieldErrors | void> {
    try {
      await api.put("/api/my/readings", values);
      toast.success("Показания отправлены");
      editing = false;
      await invalidate("app:my-readings");
      formKey++;
    } catch (err) {
      if (err instanceof ApiError) {
        if (Object.keys(err.fieldErrors).length === 0) toast.error(err.userMessage);
        return err.fieldErrors;
      }
      toast.error("Нет связи с сервером. Попробуйте ещё раз");
    }
  }
</script>

<PageHeader title="Показания" />

<Card class="mb-6">
  {#if r.period}
    <div class="flex flex-wrap items-center justify-between gap-2">
      <h2 class="text-lg font-medium">{formatPeriod(r.period.year, r.period.month)}</h2>
      <StatusBadge
        kind="period"
        value={r.period.status === "readings_open" ? "readings_open" : "readings_closed"}
      />
    </div>
    <p class="mt-1 text-muted">
      Приём показаний: {formatDate(r.period.readingsStart)} — {formatDate(r.period.readingsEnd)}
    </p>
  {/if}

  {#if r.canSubmit}
    {#if r.current && !editing}
      <div class="mt-4 flex flex-col gap-3">
        <p class="flex items-center gap-2 font-medium text-success-fg">
          <CircleCheck class="size-5" aria-hidden="true" />
          Показания переданы {formatDateTime(r.current.enteredAt, tz)}
          {r.current.enteredByAdmin ? "(внесены администратором)" : ""}
        </p>
        <dl class="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1">
          <dt class="text-muted">ХВС</dt>
          <dd>{formatVolume(r.current.cold)}</dd>
          <dt class="text-muted">ГВС</dt>
          <dd>{formatVolume(r.current.hot)}</dd>
        </dl>
        <div><Button onclick={() => (editing = true)} variant="secondary">Исправить</Button></div>
        <p class="text-sm text-muted">Исправить можно до закрытия приёма показаний.</p>
      </div>
    {:else}
      <div class="mt-4">
        {#key formKey}
          <ReadingForm
            avgUsage={r.avgUsage}
            initial={r.current ? { cold: r.current.cold, hot: r.current.hot } : null}
            onsave={save}
            prev={r.prev}
            submitLabel="Отправить"
          />
        {/key}
        {#if editing}
          <Button class="mt-2" block onclick={() => (editing = false)} variant="ghost"
            >Отмена</Button
          >
        {/if}
      </div>
    {/if}
  {:else}
    <div class="mt-2 flex gap-3">
      <Lock class="mt-0.5 size-5 shrink-0 text-muted" aria-hidden="true" />
      <div>
        <p class="font-medium">Приём показаний закрыт</p>
        <p class="text-muted">
          Следующий приём: с {formatDate(r.nextWindow.start)} по {formatDate(r.nextWindow.end)}
        </p>
        {#if r.current}
          <p class="mt-2">
            За этот период переданы: ХВС {formatVolume(r.current.cold)}, ГВС {formatVolume(
              r.current.hot,
            )}
          </p>
        {/if}
      </div>
    </div>
  {/if}
</Card>

<Card title="История показаний">
  {#if r.history.length === 0}
    <EmptyState text="Показаний пока нет" />
  {:else}
    <table class={tableClass}>
      <thead>
        <tr>
          <th class={thClass}>Месяц</th>
          <th class={[thClass, "text-right"]}>ХВС</th>
          <th class={[thClass, "text-right"]}>Расход ХВС</th>
          <th class={[thClass, "text-right"]}>ГВС</th>
          <th class={[thClass, "text-right"]}>Расход ГВС</th>
        </tr>
      </thead>
      <tbody class="tabular-nums">
        {#each r.history as h (`${h.year}-${h.month}`)}
          <tr>
            <td class={tdClass}>{formatPeriod(h.year, h.month)}</td>
            <td class={[tdClass, "text-right"]}>{formatVolume(h.cold)}</td>
            <td class={[tdClass, "text-right"]}>{formatVolume(h.coldUsage)}</td>
            <td class={[tdClass, "text-right"]}>{formatVolume(h.hot)}</td>
            <td class={[tdClass, "text-right"]}>{formatVolume(h.hotUsage)}</td>
          </tr>
        {/each}
      </tbody>
    </table>
    <ul class={mobileListClass}>
      {#each r.history as h (`${h.year}-${h.month}`)}
        <li class="py-3">
          <p class="font-medium">{formatPeriod(h.year, h.month)}</p>
          <p class="text-sm">ХВС {formatVolume(h.cold)} · расход {formatVolume(h.coldUsage)}</p>
          <p class="text-sm">ГВС {formatVolume(h.hot)} · расход {formatVolume(h.hotUsage)}</p>
        </li>
      {/each}
    </ul>
  {/if}
</Card>
