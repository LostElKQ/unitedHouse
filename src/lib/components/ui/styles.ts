// Общие классы для нативных полей ввода, чтобы <input>, <select> и
// <textarea> во всех формах выглядели одинаково.

export const inputClass =
  "block w-full min-h-10 rounded-lg border border-line bg-surface px-3 py-2 text-base text-ink " +
  "placeholder:text-muted focus:border-graphite focus:outline-none focus:ring-2 focus:ring-graphite/20 " +
  "disabled:bg-page disabled:text-muted aria-invalid:border-danger-fg aria-invalid:ring-danger-fg/20";

export const checkboxClass = "size-5 shrink-0 rounded border-line accent-graphite";
