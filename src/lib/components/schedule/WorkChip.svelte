<!--
  @component
  Работа в календаре: цветная полоса + время, название и текст статуса
  (ФТ-17.2: цвет и обязательно текстовая подпись).
-->
<script lang="ts">
  import type { WorkItem } from "#lib/api/types.js";
  import { OVERDUE_LABEL, workStatusLabels } from "#lib/labels.js";
  import { statusView, type Tone } from "#lib/status.js";

  let {
    work,
    compact = false,
    onopen,
  }: { work: WorkItem; compact?: boolean; onopen: (w: WorkItem) => void } = $props();

  let tone: Tone = $derived(
    work.overdue ? "danger" : statusView({ kind: "work", value: work.status }).tone,
  );

  const bar: Record<Tone, string> = {
    neutral: "border-l-neutral-fg/50 bg-neutral-bg",
    info: "border-l-info-fg bg-info-bg",
    success: "border-l-success-fg bg-success-bg",
    warning: "border-l-warning-fg bg-warning-bg",
    danger: "border-l-danger-fg bg-danger-bg",
  };
  const text: Record<Tone, string> = {
    neutral: "text-neutral-fg",
    info: "text-info-fg",
    success: "text-success-fg",
    warning: "text-warning-fg",
    danger: "text-danger-fg",
  };
</script>

<button
  class={[
    "w-full rounded-md border-l-4 px-2 py-1.5 text-left hover:brightness-95",
    bar[tone],
    work.status === "cancelled" && "opacity-75",
  ]}
  onclick={() => onopen(work)}
  type="button"
>
  <span
    class={[
      "block truncate text-sm font-medium text-ink",
      work.status === "cancelled" && "line-through",
    ]}
  >
    {#if work.timeStart}<span class="tabular-nums">{work.timeStart}</span>{/if}
    {work.title}
  </span>
  {#if !compact}
    <span class={["block text-sm", text[tone]]}>
      {workStatusLabels[work.status]}{work.overdue ? ` · ${OVERDUE_LABEL}` : ""}
    </span>
  {:else}
    <span class="sr-only"
      >{workStatusLabels[work.status]}{work.overdue ? `, ${OVERDUE_LABEL}` : ""}</span
    >
  {/if}
</button>
