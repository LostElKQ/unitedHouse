<script lang="ts">
  import DemoLinks from "./demo/DemoLinks.svelte";
  import "./layout.css";
  import favicon from "#lib/assets/favicon.svg";
  import type { LayoutProps } from "./$types";

  let { children }: LayoutProps = $props();
</script>

<svelte:head>
  <link href={favicon} rel="icon" />
</svelte:head>

{@render children()}
<DemoLinks />
