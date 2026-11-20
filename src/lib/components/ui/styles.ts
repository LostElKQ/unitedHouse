// Общие классы для нативных полей ввода, чтобы <input>, <select> и
// <textarea> во всех формах выглядели одинаково.

export const inputClass =
  "block w-full min-h-10 rounded-lg border border-line bg-surface px-3 py-2 text-base text-ink " +
  "placeholder:text-muted focus:border-graphite focus:outline-none focus:ring-2 focus:ring-graphite/20 " +
  "disabled:bg-page disabled:text-muted aria-invalid:border-danger-fg aria-invalid:ring-danger-fg/20";

export const checkboxClass = "size-5 shrink-0 rounded border-line accent-graphite";

// Таблицы (на компьютере). На телефоне те же данные выводятся карточками.
export const tableClass = "hidden w-full border-collapse text-left md:table";
export const thClass =
  "border-b border-line px-3 py-2 text-sm font-medium whitespace-nowrap text-muted first:pl-0 last:pr-0";
export const tdClass = "border-b border-line px-3 py-3 align-top first:pl-0 last:pr-0";
/** Список карточек вместо таблицы на узком экране */
export const mobileListClass = "flex flex-col divide-y divide-line md:hidden";
