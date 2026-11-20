<script lang="ts">
  import "@fontsource/ibm-plex-sans/400.css";
  import "@fontsource/ibm-plex-sans/500.css";
  import "@fontsource/ibm-plex-sans/600.css";
  import "@fontsource/rubik/500.css";
  import "./layout.css";
  import favicon from "#lib/assets/favicon.svg";
  import Toaster from "#lib/components/ui/Toaster.svelte";
  import type { LayoutProps } from "./$types";

  let { children }: LayoutProps = $props();
</script>

<svelte:head>
  <link href={favicon} rel="icon" />
  <title>Единый дом</title>
</svelte:head>

{@render children()}
<Toaster />
