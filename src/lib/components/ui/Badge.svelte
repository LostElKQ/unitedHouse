<!--
  @component
  Цветная метка. Цвет никогда не единственный носитель смысла —
  внутри всегда текст (СТ 5.1, «Доступность»).
-->
<script lang="ts">
  import type { Snippet } from "svelte";
  import type { Tone } from "#lib/status.js";

  let { tone = "neutral", children }: { tone?: Tone; children: Snippet } = $props();

  const tones: Record<Tone, string> = {
    neutral: "bg-neutral-bg text-neutral-fg",
    info: "bg-info-bg text-info-fg",
    success: "bg-success-bg text-success-fg",
    warning: "bg-warning-bg text-warning-fg",
    danger: "bg-danger-bg text-danger-fg",
  };
</script>

<span
  class={[
    "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-sm font-medium whitespace-nowrap",
    tones[tone],
  ]}
>
  {@render children()}
</span>
