// =====================================================================
// Пункты меню по ролям — названия строго как в СТ 5.1 (проверка НП-8).
// `short` — короткая подпись для нижней панели на телефоне.
// Первые MOBILE_SLOTS пунктов попадают в нижнюю панель, остальные —
// в меню «Ещё».
// =====================================================================
import type { Component } from "svelte";
import { resolve } from "$app/paths";
import type { ResolvedPathname, RouteId } from "$app/types";
import type { LucideProps } from "@lucide/svelte";
import {
  Building2,
  CalendarDays,
  ClipboardList,
  CreditCard,
  Gauge,
  House,
  ListChecks,
  Megaphone,
  Receipt,
  Settings,
  UserRound,
  Users,
  Wallet,
  Wrench,
} from "@lucide/svelte";

export type NavItem = {
  /** Идентификатор маршрута SvelteKit (с группами в скобках) */
  route: RouteId;
  label: string;
  short?: string;
  icon: Component<LucideProps>;
  /** Активен только при точном совпадении адреса (для корневых разделов) */
  exact?: boolean;
};

export const MOBILE_SLOTS = 4;

export const residentNav: NavItem[] = [
  { route: "/(resident)", label: "Главная", icon: House, exact: true },
  { route: "/(resident)/readings", label: "Показания", icon: Gauge },
  { route: "/(resident)/receipts", label: "Квитанции", icon: Receipt },
  { route: "/(resident)/requests", label: "Заявки", icon: Wrench },
  { route: "/(resident)/schedule", label: "График работ", icon: CalendarDays },
  { route: "/(resident)/announcements", label: "Объявления", icon: Megaphone },
  { route: "/(resident)/profile", label: "Профиль", icon: UserRound },
];

export const adminNav: NavItem[] = [
  { route: "/admin/residents", label: "Жители", icon: Users },
  { route: "/admin/apartments", label: "Квартиры", icon: Building2 },
  { route: "/admin/tariffs", label: "Тарифы", icon: CreditCard },
  { route: "/admin/billing", label: "Показания и начисления", short: "Начисления", icon: Gauge },
  { route: "/admin/payments", label: "Оплаты", icon: Wallet },
  { route: "/admin/requests", label: "Заявки", icon: Wrench },
  { route: "/admin/schedule", label: "График работ", short: "График", icon: CalendarDays },
  { route: "/admin/maintenance", label: "Перечень работ", icon: ListChecks },
  { route: "/admin/announcements", label: "Объявления", icon: Megaphone },
  { route: "/admin/settings", label: "Настройки", icon: Settings },
];

/** Что администратор видит в нижней панели телефона — самые частые разделы */
export const adminMobilePrimary: Array<NavItem["route"]> = [
  "/admin/residents",
  "/admin/billing",
  "/admin/requests",
  "/admin/schedule",
];

export const executorNav: NavItem[] = [
  { route: "/works", label: "Мои работы", icon: ClipboardList, exact: true },
  { route: "/works/profile", label: "Профиль", icon: UserRound },
];

/** Адрес страницы по идентификатору маршрута: "/(resident)/readings" → "/readings" */
export function routePath(route: RouteId): string {
  return route.replace(/\/\([^)]+\)/g, "") || "/";
}

/**
 * Ссылка на маршрут без параметров с учётом base path.
 * resolve() не принимает объединение маршрутов, поэтому приводим тип.
 */
export function routeHref(route: RouteId): ResolvedPathname {
  return (resolve as (route: string) => ResolvedPathname)(route);
}

export function isActive(item: NavItem, pathname: string): boolean {
  const path = routePath(item.route);
  if (item.exact) return pathname === path;
  return pathname === path || pathname.startsWith(`${path}/`);
}

/** Ссылка на маршрут с параметрами поиска: routeWithQuery("/admin/schedule", "view=month") */
export function routeWithQuery(route: RouteId, query: string): ResolvedPathname {
  const base = routeHref(route);
  return (query ? `${base}?${query}` : base) as ResolvedPathname;
}
