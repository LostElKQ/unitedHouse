<!--
  @component
  Временная заглушка раздела. Удаляется, когда раздел готов.
  `nextVersion` — функция перенесена во вторую версию MVP.
-->
<script lang="ts">
  import { Construction } from "@lucide/svelte";
  import Card from "./Card.svelte";
  import PageHeader from "./PageHeader.svelte";

  let { title, nextVersion = false }: { title: string; nextVersion?: boolean } = $props();
</script>

<PageHeader {title} />

<Card>
  <div class="flex flex-col items-center gap-3 py-10 text-center">
    <Construction class="size-10 text-muted" aria-hidden="true" />
    <p class="text-lg font-medium">
      {nextVersion ? "Раздел появится в следующей версии" : "Раздел в разработке"}
    </p>
  </div>
</Card>
