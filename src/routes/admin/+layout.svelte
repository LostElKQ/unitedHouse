<script lang="ts">
  import AppShell from "#lib/components/layout/AppShell.svelte";
  import { adminMobilePrimary, adminNav } from "#lib/components/layout/nav.js";
  import type { LayoutProps } from "./$types";

  let { data, children }: LayoutProps = $props();
</script>

<AppShell
  home="/admin"
  items={adminNav}
  mobilePrimary={adminMobilePrimary}
  profile="/admin/profile"
  user={data.user}
>
  {@render children()}
</AppShell>
