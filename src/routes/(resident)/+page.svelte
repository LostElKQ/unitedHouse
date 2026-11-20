<!--
  Главная жителя. Полная версия (функция 3.21 — блоки «Показания»,
  «Оплата», «Сегодня и завтра», «Мои заявки», «Объявления», контакты)
  — во второй версии MVP. Пока — приветствие и быстрые переходы.
-->
<script lang="ts">
  import { routeHref } from "#lib/components/layout/nav.js";
  import { Gauge, Receipt, Wrench } from "@lucide/svelte";
  import Card from "#lib/components/ui/Card.svelte";
  import PageHeader from "#lib/components/ui/PageHeader.svelte";
  import type { PageProps } from "./$types";

  let { data }: PageProps = $props();

  const links = [
    { href: "/(resident)/readings", label: "Передать показания", icon: Gauge },
    { href: "/(resident)/receipts", label: "Квитанции", icon: Receipt },
    { href: "/(resident)/requests", label: "Заявки", icon: Wrench },
  ] as const;
</script>

<PageHeader
  description={data.user ? `Здравствуйте, ${data.user.name}` : undefined}
  title="Главная"
/>

<div class="grid gap-4 sm:grid-cols-3">
  {#each links as link (link.href)}
    <a class="group" href={routeHref(link.href)}>
      <Card class="h-full transition-colors group-hover:border-graphite">
        <div class="flex items-center gap-3">
          <link.icon class="size-6 text-graphite" aria-hidden="true" />
          <span class="text-lg font-medium">{link.label}</span>
        </div>
      </Card>
    </a>
  {/each}
</div>
