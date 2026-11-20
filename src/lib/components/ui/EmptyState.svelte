<!-- @component Пустой список: короткий текст по центру -->
<script lang="ts">
  import type { Snippet } from "svelte";

  let { text, children }: { text: string; children?: Snippet } = $props();
</script>

<div class="flex flex-col items-center gap-3 py-10 text-center text-muted">
  <p>{text}</p>
  {@render children?.()}
</div>
