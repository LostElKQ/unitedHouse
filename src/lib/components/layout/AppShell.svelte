<!--
  @component
  Оболочка для вошедшего пользователя (СТ 5.1, «Расположение»):
  графитовая шапка, на компьютере — боковое меню, на телефоне — нижняя
  панель из 4 пунктов и «Ещё» для остальных.
  Используется в +layout.svelte групп (resident), admin и works.
-->
<script lang="ts">
  import type { Snippet } from "svelte";
  import { afterNavigate, goto, invalidateAll } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { page } from "$app/state";
  import { Building, Ellipsis, LogOut } from "@lucide/svelte";
  import { authClient } from "#lib/auth-client.js";
  import { userRoleLabels } from "#lib/labels.js";
  import type { CurrentUser } from "#lib/types.js";
  import Modal from "../ui/Modal.svelte";
  import { toast } from "../ui/toast.svelte.ts";
  import type { RouteId } from "$app/types";
  import { isActive, MOBILE_SLOTS, routeHref, type NavItem } from "./nav.ts";

  type Props = {
    user: CurrentUser | null;
    /** Пункты в порядке бокового меню */
    items: NavItem[];
    /** Какие пункты показать в нижней панели телефона (по умолчанию первые 4) */
    mobilePrimary?: Array<NavItem["route"]>;
    /** Куда ведёт логотип */
    home: RouteId;
    /** Куда ведёт имя пользователя в шапке */
    profile: RouteId;
    children: Snippet;
  };

  let { user, items, mobilePrimary, home, profile, children }: Props = $props();

  let primary = $derived(
    mobilePrimary
      ? items.filter((i) => mobilePrimary.includes(i.route))
      : items.slice(0, items.length <= MOBILE_SLOTS + 1 ? items.length : MOBILE_SLOTS),
  );
  let secondary = $derived(items.filter((i) => !primary.includes(i)));
  let moreActive = $derived(secondary.some((i) => isActive(i, page.url.pathname)));

  let moreOpen = $state(false);
  let loggingOut = $state(false);

  afterNavigate(() => {
    moreOpen = false;
  });

  async function logout(): Promise<void> {
    loggingOut = true;
    try {
      await authClient.signOut();
      await invalidateAll();
      await goto(resolve("/(guest)/login"));
    } catch {
      toast.error("Не удалось выйти. Попробуйте ещё раз");
    } finally {
      loggingOut = false;
    }
  }
</script>

<a
  class="sr-only z-50 rounded-md bg-surface px-4 py-2 text-ink focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
  href="#main"
>
  Перейти к содержимому
</a>

<header class="sticky top-0 z-30 flex h-14 items-center gap-3 bg-graphite px-4 text-white sm:px-6">
  <a class="flex items-center gap-2 font-heading text-lg font-medium" href={routeHref(home)}>
    <Building class="size-6" aria-hidden="true" />
    Единый дом
  </a>

  {#if user}
    <a
      class="ml-auto hidden min-w-0 flex-col items-end leading-tight hover:underline sm:flex"
      href={routeHref(profile)}
    >
      <span class="truncate text-sm font-medium">{user.name}</span>
      <span class="text-sm text-white/75">{userRoleLabels[user.role]}</span>
    </a>
  {/if}

  <button
    class={[
      "inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-medium hover:bg-white/10",
      !user && "ml-auto",
      user && "ml-auto sm:ml-0",
    ]}
    disabled={loggingOut}
    onclick={logout}
    type="button"
  >
    <LogOut class="size-5" aria-hidden="true" />
    <span>Выйти</span>
  </button>
</header>

<div class="flex">
  <nav
    class="sticky top-14 hidden h-[calc(100dvh-3.5rem)] w-64 shrink-0 overflow-y-auto border-r border-line bg-surface p-3 md:block"
    aria-label="Основное меню"
  >
    <ul class="flex flex-col gap-1">
      {#each items as item (item.route)}
        {@const active = isActive(item, page.url.pathname)}
        <li>
          <a
            class={[
              "flex min-h-10 items-center gap-3 rounded-lg px-3 py-2 transition-colors",
              active ? "bg-graphite text-white" : "text-ink hover:bg-page",
            ]}
            aria-current={active ? "page" : undefined}
            href={routeHref(item.route)}
          >
            <item.icon class="size-5 shrink-0" aria-hidden="true" />
            {item.label}
          </a>
        </li>
      {/each}
    </ul>
  </nav>

  <main id="main" class="min-w-0 flex-1 px-4 pt-6 pb-28 sm:px-6 md:pb-10 lg:px-8">
    <div class="mx-auto max-w-6xl">
      {@render children()}
    </div>
  </main>
</div>

<!-- Нижняя панель на телефоне -->
<nav
  class="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] md:hidden"
  aria-label="Основное меню"
>
  <ul class="flex">
    {#each primary as item (item.route)}
      {@const active = isActive(item, page.url.pathname)}
      <li class="min-w-0 flex-auto">
        <a
          class={[
            "flex min-h-16 flex-col items-center justify-center gap-1 border-t-2 px-0.5 text-sm leading-tight tracking-tight",
            active ? "border-graphite font-medium text-graphite" : "border-transparent text-muted",
          ]}
          aria-current={active ? "page" : undefined}
          href={routeHref(item.route)}
        >
          <item.icon class="size-6" aria-hidden="true" />
          <span class="max-w-full truncate">{item.short ?? item.label}</span>
        </a>
      </li>
    {/each}
    {#if secondary.length > 0}
      <li class="min-w-0 flex-auto">
        <button
          class={[
            "flex min-h-16 w-full flex-col items-center justify-center gap-1 border-t-2 px-0.5 text-sm leading-tight",
            moreActive
              ? "border-graphite font-medium text-graphite"
              : "border-transparent text-muted",
          ]}
          aria-haspopup="dialog"
          onclick={() => (moreOpen = true)}
          type="button"
        >
          <Ellipsis class="size-6" aria-hidden="true" />
          <span>Ещё</span>
        </button>
      </li>
    {/if}
  </ul>
</nav>

<Modal title="Ещё" bind:open={moreOpen}>
  <ul class="-mx-2 flex flex-col gap-1">
    {#each secondary as item (item.route)}
      {@const active = isActive(item, page.url.pathname)}
      <li>
        <a
          class={[
            "flex min-h-12 items-center gap-3 rounded-lg px-3",
            active ? "bg-graphite text-white" : "hover:bg-page",
          ]}
          aria-current={active ? "page" : undefined}
          href={routeHref(item.route)}
        >
          <item.icon class="size-5" aria-hidden="true" />
          {item.label}
        </a>
      </li>
    {/each}
    {#if user && !items.some((i) => i.route === profile)}
      <li>
        <a
          class="flex min-h-12 items-center gap-3 rounded-lg px-3 hover:bg-page"
          href={routeHref(profile)}
        >
          Профиль
        </a>
      </li>
    {/if}
  </ul>
</Modal>
