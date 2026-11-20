<!--
  ФТ-2.5: экран ожидания подтверждения. Остальные разделы недоступны —
  это обеспечивают guards на сервере и checkAuthAccess в API.
-->
<script lang="ts">
  import { Hourglass } from "@lucide/svelte";
  import Card from "#lib/components/ui/Card.svelte";
  import LogoutButton from "#lib/components/ui/LogoutButton.svelte";
  import PageHeader from "#lib/components/ui/PageHeader.svelte";
  import type { PageProps } from "./$types";

  let { data }: PageProps = $props();
</script>

<PageHeader title="Ожидает подтверждения" />

<Card>
  <div class="flex flex-col items-center gap-3 text-center">
    <Hourglass class="size-10 text-warning-fg" aria-hidden="true" />
    <p class="text-lg font-medium">Заявка на регистрацию передана в правление ТСЖ</p>
    <p class="text-muted">
      {#if data.user?.apartment}
        Администратор проверит, что вы живёте в квартире {data.user.apartment.number}, и подтвердит
        учётную запись.
      {:else}
        Администратор проверит данные и подтвердит учётную запись.
      {/if}
      После этого здесь откроются показания, квитанции, заявки и график работ.
    </p>
    {#if data.hoa.boardPhone}
      <p>
        Вопросы — по телефону правления
        <a class="font-medium underline" href="tel:{data.hoa.boardPhone.replace(/[^\d+]/g, '')}">
          {data.hoa.boardPhone}
        </a>
      </p>
    {/if}
    <div class="mt-2"><LogoutButton /></div>
  </div>
</Card>
