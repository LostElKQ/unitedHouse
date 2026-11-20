<!--
  @component
  Метка статуса с цветом и русской подписью.

  ```svelte
  <StatusBadge kind="work" value="rescheduled" />   → оранжевая «Перенесена»
  <StatusBadge kind="request" value={r.status} />
  <StatusBadge kind="overdue" />                     → красная «Просрочена»
  ```
-->
<script lang="ts">
  import Badge from "./Badge.svelte";
  import { statusView, type StatusRef } from "#lib/status.js";

  let props: StatusRef = $props();

  let view = $derived(statusView(props));
</script>

<Badge tone={view.tone}>{view.label}</Badge>
