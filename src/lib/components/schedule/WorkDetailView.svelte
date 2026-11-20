<!--
  @component
  Карточка работы (ФТ-17.4): все поля, история переносов, отчёт о
  выполнении с фото. Кнопки действий передаёт страница (actions).
-->
<script lang="ts">
  import type { Snippet } from "svelte";
  import type { WorkDetail } from "#lib/api/types.js";
  import Badge from "#lib/components/ui/Badge.svelte";
  import StatusBadge from "#lib/components/ui/StatusBadge.svelte";
  import { formatDate, formatDateTime } from "#lib/format.js";
  import {
    categoryLabels,
    priorityLabels,
    workLocationLabels,
    workTypeLabels,
  } from "#lib/labels.js";

  let { work: w, tz, actions }: { work: WorkDetail; tz: string; actions?: Snippet } = $props();

  let place = $derived(
    [
      workLocationLabels[w.location],
      w.location === "entrance" && w.entrance ? `${w.entrance}-й` : null,
      w.locationDetail,
    ]
      .filter(Boolean)
      .join(", "),
  );
</script>

<div class="flex flex-col gap-4">
  <div class="flex flex-wrap gap-2">
    <StatusBadge kind="work" value={w.status} />
    {#if w.overdue}<StatusBadge kind="overdue" />{/if}
    <Badge>{workTypeLabels[w.type]}</Badge>
    {#if w.priority}<Badge tone={w.priority === "urgent" ? "danger" : "neutral"}
        >Приоритет: {priorityLabels[w.priority]}</Badge
      >{/if}
  </div>

  <dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5">
    <dt class="text-muted">Дата</dt>
    <dd>
      {formatDate(w.workDate)}{w.timeStart ? `, ${w.timeStart}` : ""}{w.timeEnd
        ? `–${w.timeEnd}`
        : ""}
    </dd>
    <dt class="text-muted">Категория</dt>
    <dd>{categoryLabels[w.category]}</dd>
    <dt class="text-muted">Место</dt>
    <dd>{place}</dd>
    <dt class="text-muted">Исполнитель</dt>
    <dd>{w.executorName ?? w.contractor ?? "Не назначен"}</dd>
    {#if w.requestNumber}
      <dt class="text-muted">По заявке</dt>
      <dd>№{w.requestNumber}</dd>
    {/if}
  </dl>

  {#if w.description}<p class="whitespace-pre-line">{w.description}</p>{/if}

  {#if w.requestPhotos.length}
    <div>
      <p class="mb-1 text-sm text-muted">Фото из заявки</p>
      {@render gallery(w.requestPhotos, "Фото из заявки")}
    </div>
  {/if}

  {#if w.reschedules.length}
    <section>
      <h3 class="mb-1 font-medium">История переносов</h3>
      <ul class="flex flex-col gap-1 text-sm">
        {#each w.reschedules as r (r.createdAt)}
          <li>
            {formatDate(r.oldDate)} → {formatDate(r.newDate)}: {r.reason}
            <span class="text-muted">({formatDateTime(r.createdAt, tz)})</span>
          </li>
        {/each}
      </ul>
    </section>
  {/if}

  {#if w.status === "done"}
    <section class="rounded-lg bg-success-bg p-3">
      <h3 class="font-medium text-success-fg">
        Выполнено{w.completedOn ? ` ${formatDate(w.completedOn)}` : ""}
      </h3>
      {#if w.report}<p class="mt-1 whitespace-pre-line">{w.report}</p>{/if}
      {#if w.photos.length}<div class="mt-2">
          {@render gallery(w.photos, "Фото после выполнения")}
        </div>{/if}
    </section>
  {/if}

  {#if actions}<div class="flex flex-wrap gap-2 border-t border-line pt-4">
      {@render actions()}
    </div>{/if}
</div>

{#snippet gallery(list: WorkDetail["photos"], alt: string)}
  <div class="flex flex-wrap gap-2">
    {#each list as p, i (p.id)}
      <a href={p.url} rel="external" target="_blank">
        <img
          class="size-24 rounded-lg border border-line object-cover"
          alt="{alt} {i + 1}"
          loading="lazy"
          src={p.url}
        />
      </a>
    {/each}
  </div>
{/snippet}
