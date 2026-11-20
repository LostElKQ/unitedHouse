<!--
  Страницы гостя (вход, регистрация, восстановление пароля, ожидание
  подтверждения): без меню, карточка по центру.
-->
<script lang="ts">
  import { Building } from "@lucide/svelte";
  import type { LayoutProps } from "./$types";

  let { children }: LayoutProps = $props();
</script>

<div class="flex min-h-dvh flex-col">
  <header class="flex h-14 items-center bg-graphite px-4 text-white sm:px-6">
    <span class="flex items-center gap-2 font-heading text-lg font-medium">
      <Building class="size-6" aria-hidden="true" />
      Единый дом
    </span>
  </header>

  <main id="main" class="flex flex-1 items-start justify-center px-4 py-8 sm:py-16">
    <div class="w-full max-w-md">
      {@render children()}
    </div>
  </main>
</div>
