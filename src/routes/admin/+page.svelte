<!--
  Панель администратора (ФТ-2.4 — сюда попадает администратор после входа).
  Пока — переходы по разделам; сводка (заявки на подтверждение, статус
  периода, напоминание о закрытии приёма) появится по мере готовности API.
-->
<script lang="ts">
  import { adminNav, routeHref } from "#lib/components/layout/nav.js";
  import Card from "#lib/components/ui/Card.svelte";
  import PageHeader from "#lib/components/ui/PageHeader.svelte";
</script>

<PageHeader title="Панель администратора" />

<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
  {#each adminNav as item (item.route)}
    <a class="group" href={routeHref(item.route)}>
      <Card class="h-full transition-colors group-hover:border-graphite">
        <div class="flex items-center gap-3">
          <item.icon class="size-6 text-graphite" aria-hidden="true" />
          <span class="text-lg font-medium">{item.label}</span>
        </div>
      </Card>
    </a>
  {/each}
</div>
