<!--
  @component
  Форма показаний ХВС и ГВС — общая для жителя (3.9) и администратора (3.10).
  ФТ-9.1: предыдущие показания, ввод текущих (м³, до 3 знаков) и расход.
  ФТ-9.3: текущее не меньше предыдущего — ошибка у поля.
  ФТ-9.4: расход более чем в 3 раза выше среднего — просим проверить,
  но отправку не запрещаем.
-->
<script lang="ts">
  import { TriangleAlert } from "@lucide/svelte";
  import type { FieldErrors } from "#lib/api/client.js";
  import Button from "#lib/components/ui/Button.svelte";
  import Field from "#lib/components/ui/Field.svelte";
  import { inputClass } from "#lib/components/ui/styles.js";
  import { formatVolume } from "#lib/format.js";
  import { readingSchema } from "#lib/schemas.js";
  import { validate } from "#lib/validation.js";

  type Values = { cold: string; hot: string };

  type Props = {
    prev: Values;
    initial?: Values | null;
    /** Средний расход за 3 месяца, для предупреждения ФТ-9.4 */
    avgUsage?: Values | null;
    submitLabel?: string;
    /** id формы — чтобы кнопку можно было вынести в подвал модального окна */
    id?: string;
    hideSubmit?: boolean;
    /** Сохранение; вернуть ошибки полей, если сервер их прислал */
    onsave: (values: Values) => Promise<FieldErrors | void>;
  };

  let {
    prev,
    initial = null,
    avgUsage = null,
    submitLabel = "Отправить",
    id,
    hideSubmit = false,
    onsave,
  }: Props = $props();

  const toInput = (v: string): string => Number(v).toFixed(3).replace(".", ",");

  // Форма заполняется один раз при открытии; дальше её значения — свои
  // svelte-ignore state_referenced_locally
  const values: Values = $state(
    initial ? { cold: toInput(initial.cold), hot: toInput(initial.hot) } : { cold: "", hot: "" },
  );
  let errors: FieldErrors = $state({});
  let busy = $state(false);
  let confirmed = $state(false);

  function usage(cur: string, before: string): number | null {
    const n = Number(cur.trim().replace(",", "."));
    if (!cur.trim() || Number.isNaN(n)) return null;
    return Math.round(n * 1000 - Number(before) * 1000) / 1000;
  }

  let coldUsage = $derived(usage(values.cold, prev.cold));
  let hotUsage = $derived(usage(values.hot, prev.hot));

  let warnings = $derived.by(() => {
    const out: string[] = [];
    if (!avgUsage) return out;
    const check = (label: string, u: number | null, avg: string): void => {
      const a = Number(avg);
      if (u !== null && a > 0 && u > 3 * a)
        out.push(
          `${label}: расход ${formatVolume(u)} — более чем в 3 раза выше среднего (${formatVolume(a)})`,
        );
    };
    check("ХВС", coldUsage, avgUsage.cold);
    check("ГВС", hotUsage, avgUsage.hot);
    return out;
  });

  $effect(() => {
    // предупреждение нужно подтвердить заново, если значения изменились
    void values.cold;
    void values.hot;
    confirmed = false;
  });

  async function submit(e: SubmitEvent): Promise<void> {
    e.preventDefault();
    const v = validate(readingSchema, values);
    const local: FieldErrors = v.ok ? {} : { ...v.errors };
    if (coldUsage !== null && coldUsage < 0)
      local["cold"] = [`Не может быть меньше предыдущего показания (${formatVolume(prev.cold)})`];
    if (hotUsage !== null && hotUsage < 0)
      local["hot"] = [`Не может быть меньше предыдущего показания (${formatVolume(prev.hot)})`];
    errors = local;
    if (Object.keys(local).length > 0) return;
    if (warnings.length > 0 && !confirmed) {
      confirmed = true;
      return;
    }
    busy = true;
    try {
      errors = (await onsave(values)) ?? {};
    } finally {
      busy = false;
    }
  }
</script>

<form {id} class="flex flex-col gap-4" novalidate onsubmit={submit}>
  <div class="grid gap-4 sm:grid-cols-2">
    {@render meter("cold", "Холодная вода (ХВС)", prev.cold, coldUsage)}
    {@render meter("hot", "Горячая вода (ГВС)", prev.hot, hotUsage)}
  </div>

  {#if confirmed && warnings.length > 0}
    <div class="flex gap-3 rounded-lg bg-warning-bg px-4 py-3 text-warning-fg" role="alert">
      <TriangleAlert class="mt-0.5 size-5 shrink-0" aria-hidden="true" />
      <div>
        {#each warnings as w (w)}<p>{w}</p>{/each}
        <p class="mt-1 font-medium">
          Проверьте значение. Если всё верно — нажмите «{submitLabel}» ещё раз.
        </p>
      </div>
    </div>
  {/if}

  {#if !hideSubmit}
    <Button block loading={busy} size="lg" type="submit">{submitLabel}</Button>
  {/if}
</form>

{#snippet meter(key: "cold" | "hot", title: string, before: string, used: number | null)}
  <fieldset class="flex flex-col gap-2 rounded-lg border border-line p-4">
    <legend class="px-1 font-medium">{title}</legend>
    <p class="text-sm text-muted">
      Предыдущее показание: <span class="text-ink">{formatVolume(before)}</span>
    </p>
    <Field error={errors[key]} label="Текущее показание, м³" required>
      {#snippet children(attrs)}
        <input
          {...attrs}
          class={[inputClass, "text-lg"]}
          autocomplete="off"
          inputmode="decimal"
          placeholder={toInput(before)}
          bind:value={values[key]}
        />
      {/snippet}
    </Field>
    <p class="text-sm" aria-live="polite">
      Расход:
      <span class="font-medium">{used !== null && used >= 0 ? formatVolume(used) : "—"}</span>
    </p>
  </fieldset>
{/snippet}
