<script lang="ts">
  import AppShell from "#lib/components/layout/AppShell.svelte";
  import { residentNav } from "#lib/components/layout/nav.js";
  import type { LayoutProps } from "./$types";

  let { data, children }: LayoutProps = $props();
</script>

<AppShell home="/(resident)" items={residentNav} profile="/(resident)/profile" user={data.user}>
  {@render children()}
</AppShell>
