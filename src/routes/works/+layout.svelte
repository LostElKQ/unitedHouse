<script lang="ts">
  import AppShell from "#lib/components/layout/AppShell.svelte";
  import { executorNav } from "#lib/components/layout/nav.js";
  import type { LayoutProps } from "./$types";

  let { data, children }: LayoutProps = $props();
</script>

<AppShell home="/works" items={executorNav} profile="/works/profile" user={data.user}>
  {@render children()}
</AppShell>
