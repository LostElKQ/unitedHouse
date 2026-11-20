<!--
  @component
  График работ (ФТ-17.1–17.3): режимы «День», «Неделя», «Месяц», «Список»,
  по умолчанию — текущая неделя; фильтры по подъезду («Мой подъезд»),
  типу и категории. Состояние — в адресе страницы, поэтому ссылку на
  нужную неделю можно отправить соседу.
-->
<script lang="ts">
  import type { RouteId } from "$app/types";
  import { ChevronLeft, ChevronRight } from "@lucide/svelte";
  import type { WorkItem } from "#lib/api/types.js";
  import { routeWithQuery } from "#lib/components/layout/nav.js";
  import Card from "#lib/components/ui/Card.svelte";
  import EmptyState from "#lib/components/ui/EmptyState.svelte";
  import Field from "#lib/components/ui/Field.svelte";
  import { inputClass } from "#lib/components/ui/styles.js";
  import { categoryLabels, toOptions, workTypeLabels } from "#lib/labels.js";
  import {
    dayMonth,
    days,
    monthEnd,
    monthStart,
    rangeFor,
    shift,
    titleFor,
    VIEWS,
    WEEKDAY_HEADERS,
    weekdayShort,
    type View,
  } from "./calendar.ts";
  import type { ScheduleData } from "./load.ts";
  import WorkChip from "./WorkChip.svelte";

  type Props = {
    data: ScheduleData;
    route: RouteId;
    /** Подъезд жителя — для пункта «Мой подъезд» */
    myEntrance?: number | null;
    showFilters?: boolean;
    onopen: (w: WorkItem) => void;
  };

  let { data, route, myEntrance = null, showFilters = true, onopen }: Props = $props();

  function link(changes: Partial<{ view: View; date: string }>): ReturnType<typeof routeWithQuery> {
    const entries: Array<[string, string]> = [
      ["view", changes.view ?? data.view],
      ["date", changes.date ?? data.date],
      ["entrance", data.filters.entrance],
      ["type", data.filters.type],
      ["category", data.filters.category],
    ];
    const query = entries
      .filter(([, v]) => v)
      .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
      .join("&");
    return routeWithQuery(route, query);
  }

  let byDate = $derived.by(() => {
    const m: Record<string, WorkItem[]> = {};
    for (const w of data.works) (m[w.workDate] ??= []).push(w);
    return m;
  });

  let range = $derived(rangeFor(data.view, data.date));
  let rangeDays = $derived(days(range.from, range.to));
  let datesWithWorks = $derived(rangeDays.filter((d) => byDate[d]?.length));
  const inMonth = (d: string): boolean => d >= monthStart(data.date) && d <= monthEnd(data.date);

  const navBtn =
    "inline-flex min-h-10 items-center justify-center rounded-lg border border-line bg-surface px-3 hover:bg-page";
</script>

<!-- Навигация по периодам и режимы -->
<div class="mb-4 flex flex-wrap items-center gap-3">
  <div class="flex items-center gap-1">
    <a
      class={navBtn}
      aria-label="Предыдущий период"
      href={link({ date: shift(data.view, data.date, -1) })}
    >
      <ChevronLeft class="size-5" aria-hidden="true" />
    </a>
    <a class={navBtn} href={link({ date: data.today })}>Сегодня</a>
    <a
      class={navBtn}
      aria-label="Следующий период"
      href={link({ date: shift(data.view, data.date, 1) })}
    >
      <ChevronRight class="size-5" aria-hidden="true" />
    </a>
  </div>
  <h2 class="min-w-0 flex-1 text-lg font-medium" aria-live="polite">
    {titleFor(data.view, data.date)}
  </h2>
  <nav
    class="inline-flex rounded-lg border border-line bg-surface p-1"
    aria-label="Режим просмотра"
  >
    {#each VIEWS as v (v.id)}
      <a
        class={[
          "min-h-9 rounded-md px-3 py-1.5 text-sm",
          data.view === v.id ? "bg-graphite font-medium text-white" : "text-ink hover:bg-page",
        ]}
        aria-current={data.view === v.id ? "page" : undefined}
        href={link({ view: v.id })}
      >
        {v.label}
      </a>
    {/each}
  </nav>
</div>

{#if showFilters}
  <form class="mb-4 grid gap-3 sm:grid-cols-3" method="GET">
    <input name="view" type="hidden" value={data.view} />
    <input name="date" type="hidden" value={data.date} />
    <Field label="Подъезд">
      {#snippet children(attrs)}
        <select
          {...attrs}
          name="entrance"
          class={inputClass}
          onchange={(e) => e.currentTarget.form?.requestSubmit()}
          value={data.filters.entrance}
        >
          <option value="">Все подъезды</option>
          {#if myEntrance}<option value={String(myEntrance)}>Мой подъезд ({myEntrance}-й)</option
            >{/if}
          {#each data.settings.entrances.filter((e) => e !== myEntrance) as e (e)}
            <option value={String(e)}>{e}-й подъезд</option>
          {/each}
        </select>
      {/snippet}
    </Field>
    <Field label="Тип работы">
      {#snippet children(attrs)}
        <select
          {...attrs}
          name="type"
          class={inputClass}
          onchange={(e) => e.currentTarget.form?.requestSubmit()}
          value={data.filters.type}
        >
          <option value="">Все</option>
          {#each toOptions(workTypeLabels) as o (o.value)}<option value={o.value}>{o.label}</option
            >{/each}
        </select>
      {/snippet}
    </Field>
    <Field label="Категория">
      {#snippet children(attrs)}
        <select
          {...attrs}
          name="category"
          class={inputClass}
          onchange={(e) => e.currentTarget.form?.requestSubmit()}
          value={data.filters.category}
        >
          <option value="">Все категории</option>
          {#each toOptions(categoryLabels) as o (o.value)}<option value={o.value}>{o.label}</option
            >{/each}
        </select>
      {/snippet}
    </Field>
    <noscript><button type="submit">Применить</button></noscript>
  </form>
{/if}

{#if data.view === "month"}
  <!-- Сетка месяца на компьютере -->
  <Card class="hidden overflow-hidden md:block" padded={false}>
    <div class="grid grid-cols-7 border-b border-line bg-page text-sm text-muted">
      {#each WEEKDAY_HEADERS as h (h)}<div class="px-2 py-2 text-center">{h}</div>{/each}
    </div>
    <div class="grid grid-cols-7">
      {#each rangeDays as d (d)}
        {@const list = byDate[d] ?? []}
        <div
          class={[
            "min-h-28 border-r border-b border-line p-1.5 [&:nth-child(7n)]:border-r-0",
            !inMonth(d) && "bg-page/60",
          ]}
        >
          <a
            class={[
              "mb-1 inline-flex size-7 items-center justify-center rounded-full text-sm",
              d === data.today
                ? "bg-graphite font-medium text-white"
                : inMonth(d)
                  ? "text-ink hover:bg-page"
                  : "text-muted",
            ]}
            aria-label="{weekdayShort(d)}, {dayMonth(d)}"
            href={link({ view: "day", date: d })}
          >
            {Number(d.slice(8))}
          </a>
          <div class="flex flex-col gap-1">
            {#each list.slice(0, 3) as w (w.id)}<WorkChip {onopen} work={w} />{/each}
            {#if list.length > 3}
              <a class="px-1 text-sm text-muted underline" href={link({ view: "day", date: d })}
                >ещё {list.length - 3}</a
              >
            {/if}
          </div>
        </div>
      {/each}
    </div>
  </Card>
  <!-- На телефоне месяц — списком по дням -->
  <div class="md:hidden">{@render agenda(datesWithWorks.filter(inMonth))}</div>
{:else if data.view === "week"}
  <div class="grid gap-3 md:grid-cols-7 md:gap-2">
    {#each rangeDays as d (d)}
      {@const list = byDate[d] ?? []}
      <section
        class={[
          "rounded-xl border bg-surface p-2",
          d === data.today ? "border-graphite" : "border-line",
          list.length === 0 && "max-md:hidden",
        ]}
      >
        <h3 class="mb-2 flex items-baseline gap-2 px-1 text-sm">
          <a class="font-medium hover:underline" href={link({ view: "day", date: d })}
            >{weekdayShort(d)}</a
          >
          <span class="text-muted">{dayMonth(d)}</span>
          {#if d === data.today}<span class="ml-auto text-sm font-medium">сегодня</span>{/if}
        </h3>
        <div class="flex flex-col gap-1.5">
          {#each list as w (w.id)}<WorkChip {onopen} work={w} />{/each}
        </div>
      </section>
    {/each}
  </div>
  {#if data.works.length === 0}<Card class="mt-3"
      ><EmptyState text="На этой неделе работ нет" /></Card
    >{/if}
{:else if data.view === "day"}
  <Card>
    {#if (byDate[data.date] ?? []).length === 0}
      <EmptyState text="На этот день работ нет" />
    {:else}
      <div class="flex flex-col gap-2">
        {#each byDate[data.date] ?? [] as w (w.id)}<WorkChip {onopen} work={w} />{/each}
      </div>
    {/if}
  </Card>
{:else}
  {@render agenda(datesWithWorks)}
{/if}

{#snippet agenda(list: string[])}
  {#if list.length === 0}
    <Card><EmptyState text="За этот период работ нет" /></Card>
  {:else}
    <div class="flex flex-col gap-3">
      {#each list as d (d)}
        <section class="rounded-xl border border-line bg-surface p-3">
          <h3 class="mb-2 text-sm">
            <span class="font-medium">{weekdayShort(d)}, {dayMonth(d)}</span>
            {#if d === data.today}<span class="text-muted"> · сегодня</span>{/if}
          </h3>
          <div class="flex flex-col gap-1.5">
            {#each byDate[d] ?? [] as w (w.id)}<WorkChip {onopen} work={w} />{/each}
          </div>
        </section>
      {/each}
    </div>
  {/if}
{/snippet}
