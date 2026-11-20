<!--
  3.7 Управление тарифами.
  ФТ-7.1 поля · 7.2 способ расчёта и единица · 7.3 проверка ставки и дат
  7.4 один действующий тариф на услугу · 7.5 использованный тариф — только закрыть
-->
<script lang="ts">
  import { invalidate } from "$app/navigation";
  import { CalendarX, Pencil, Plus, Trash2 } from "@lucide/svelte";
  import { api, ApiError, type FieldErrors } from "#lib/api/client.js";
  import type { TariffRow } from "#lib/api/types.js";
  import Badge from "#lib/components/ui/Badge.svelte";
  import Button from "#lib/components/ui/Button.svelte";
  import Card from "#lib/components/ui/Card.svelte";
  import ConfirmDialog from "#lib/components/ui/ConfirmDialog.svelte";
  import EmptyState from "#lib/components/ui/EmptyState.svelte";
  import Field from "#lib/components/ui/Field.svelte";
  import Modal from "#lib/components/ui/Modal.svelte";
  import PageHeader from "#lib/components/ui/PageHeader.svelte";
  import {
    inputClass,
    mobileListClass,
    tableClass,
    tdClass,
    thClass,
  } from "#lib/components/ui/styles.js";
  import { toast } from "#lib/components/ui/toast.svelte.js";
  import { formatDate, formatMoney, todayIso } from "#lib/format.js";
  import {
    calcMethodLabels,
    calcMethodRateUnits,
    toOptions,
    type CalcMethod,
  } from "#lib/labels.js";
  import { tariffCloseSchema, tariffSchema } from "#lib/schemas.js";
  import type { Tone } from "#lib/status.js";
  import { validate } from "#lib/validation.js";
  import type { PageProps } from "./$types";

  let { data }: PageProps = $props();

  let today = $derived(todayIso(data.hoa.timezone));
  let services = $derived([...new Set(data.tariffs.map((t) => t.service))]);

  function tariffState(t: TariffRow): { label: string; tone: Tone } {
    if (t.validTo && t.validTo < today) return { label: "Закрыт", tone: "neutral" };
    if (t.validFrom > today) return { label: "С " + formatDate(t.validFrom), tone: "info" };
    return { label: "Действует", tone: "success" };
  }

  // --- создание и изменение -------------------------------------------

  type FormState = {
    service: string;
    calcMethod: CalcMethod;
    rate: string;
    validFrom: string;
    validTo: string;
  };

  let formOpen = $state(false);
  let editing: TariffRow | null = $state(null);
  let form: FormState = $state({
    service: "",
    calcMethod: "area",
    rate: "",
    validFrom: "",
    validTo: "",
  });
  let errors: FieldErrors = $state({});
  let busy = $state(false);

  function openCreate(): void {
    editing = null;
    form = { service: "", calcMethod: "area", rate: "", validFrom: today, validTo: "" };
    errors = {};
    formOpen = true;
  }

  function openEdit(t: TariffRow): void {
    editing = t;
    form = {
      service: t.service,
      calcMethod: t.calcMethod,
      rate: t.rate.replace(".", ","),
      validFrom: t.validFrom,
      validTo: t.validTo ?? "",
    };
    errors = {};
    formOpen = true;
  }

  async function submit(e: SubmitEvent): Promise<void> {
    e.preventDefault();
    const v = validate(tariffSchema, form);
    if (!v.ok) {
      errors = v.errors;
      return;
    }
    busy = true;
    try {
      if (editing) await api.patch(`/api/tariffs/${editing.id}`, form);
      else await api.post("/api/tariffs", form);
      toast.success(editing ? "Тариф сохранён" : "Тариф добавлен");
      formOpen = false;
      await invalidate("app:tariffs");
    } catch (err) {
      if (err instanceof ApiError) {
        errors = err.fieldErrors;
        if (Object.keys(err.fieldErrors).length === 0) toast.error(err.userMessage);
      }
    } finally {
      busy = false;
    }
  }

  // --- закрытие использованного тарифа (ФТ-7.5) ------------------------

  let closing: TariffRow | null = $state(null);
  let closeOpen = $state(false);
  let closeDate = $state("");
  let closeErrors: FieldErrors = $state({});
  let closeBusy = $state(false);

  function openClose(t: TariffRow): void {
    closing = t;
    closeDate = t.validTo ?? today;
    closeErrors = {};
    closeOpen = true;
  }

  async function submitClose(e: SubmitEvent): Promise<void> {
    e.preventDefault();
    if (!closing) return;
    const v = validate(tariffCloseSchema, { validTo: closeDate });
    if (!v.ok) {
      closeErrors = v.errors;
      return;
    }
    closeBusy = true;
    try {
      await api.patch(`/api/tariffs/${closing.id}`, v.data);
      toast.success("Тариф закрыт. Теперь можно добавить новый с следующего дня");
      closeOpen = false;
      await invalidate("app:tariffs");
    } catch (err) {
      if (err instanceof ApiError) {
        closeErrors = err.fieldErrors;
        if (Object.keys(err.fieldErrors).length === 0) toast.error(err.userMessage);
      }
    } finally {
      closeBusy = false;
    }
  }

  // --- удаление -------------------------------------------------------

  let deleting: TariffRow | null = $state(null);
  let deleteOpen = $state(false);

  async function confirmDelete(): Promise<void> {
    if (!deleting) return;
    try {
      await api.delete(`/api/tariffs/${deleting.id}`);
      toast.success("Тариф удалён");
      await invalidate("app:tariffs");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.userMessage : "Не удалось удалить");
    }
  }
</script>

<PageHeader description="Услуги, способы расчёта и ставки" title="Тарифы">
  {#snippet actions()}
    <Button onclick={openCreate}>
      <Plus class="size-5" aria-hidden="true" />
      Новый тариф
    </Button>
  {/snippet}
</PageHeader>

<Card class="p-4 sm:px-6" padded={false}>
  {#if data.tariffs.length === 0}
    <EmptyState text="Тарифов пока нет. Добавьте услуги, по которым считаются начисления" />
  {:else}
    <table class={tableClass}>
      <thead>
        <tr>
          <th class={thClass}>Услуга</th>
          <th class={thClass}>Способ расчёта</th>
          <th class={[thClass, "text-right"]}>Ставка</th>
          <th class={thClass}>Действует</th>
          <th class={thClass}>Состояние</th>
          <th class={thClass}><span class="sr-only">Действия</span></th>
        </tr>
      </thead>
      <tbody>
        {#each data.tariffs as t (t.id)}
          {@const st = tariffState(t)}
          <tr>
            <td class={[tdClass, "font-medium"]}>{t.service}</td>
            <td class={tdClass}>{calcMethodLabels[t.calcMethod]}</td>
            <td class={[tdClass, "text-right whitespace-nowrap"]}>
              {formatMoney(t.rate).replace(" ₽", "")}
              <span class="text-sm text-muted">{calcMethodRateUnits[t.calcMethod]}</span>
            </td>
            <td class={[tdClass, "whitespace-nowrap"]}>
              с {formatDate(t.validFrom)}{t.validTo ? ` по ${formatDate(t.validTo)}` : ""}
            </td>
            <td class={tdClass}><Badge tone={st.tone}>{st.label}</Badge></td>
            <td class={[tdClass, "text-right whitespace-nowrap"]}>{@render actionsFor(t)}</td>
          </tr>
        {/each}
      </tbody>
    </table>

    <ul class={mobileListClass}>
      {#each data.tariffs as t (t.id)}
        {@const st = tariffState(t)}
        <li class="flex flex-col gap-1 py-3">
          <div class="flex items-start justify-between gap-2">
            <p class="font-medium">{t.service}</p>
            <Badge tone={st.tone}>{st.label}</Badge>
          </div>
          <p class="text-sm">
            {calcMethodLabels[t.calcMethod]} · {formatMoney(t.rate).replace(" ₽", "")}
            {calcMethodRateUnits[t.calcMethod]}
          </p>
          <p class="text-sm text-muted">
            с {formatDate(t.validFrom)}{t.validTo ? ` по ${formatDate(t.validTo)}` : ""}
          </p>
          <div>{@render actionsFor(t)}</div>
        </li>
      {/each}
    </ul>
    <p class="mt-3 text-sm text-muted">
      Тариф, по которому уже были начисления, изменить или удалить нельзя — закройте его датой
      окончания и добавьте новый. Опубликованные квитанции при этом не меняются.
    </p>
  {/if}
</Card>

{#snippet actionsFor(t: TariffRow)}
  {#if t.used}
    <Button onclick={() => openClose(t)} size="sm" variant="ghost">
      <CalendarX class="size-4" aria-hidden="true" />
      {t.validTo ? "Изменить дату окончания" : "Закрыть"}
    </Button>
  {:else}
    <Button
      aria-label="Изменить тариф {t.service}"
      onclick={() => openEdit(t)}
      size="sm"
      variant="ghost"
    >
      <Pencil class="size-4" aria-hidden="true" />
    </Button>
    <Button
      aria-label="Удалить тариф {t.service}"
      onclick={() => {
        deleting = t;
        deleteOpen = true;
      }}
      size="sm"
      variant="ghost"
    >
      <Trash2 class="size-4" aria-hidden="true" />
    </Button>
  {/if}
{/snippet}

<Modal {busy} title={editing ? "Тариф" : "Новый тариф"} bind:open={formOpen}>
  <form id="tariff-form" class="grid grid-cols-2 gap-3" novalidate onsubmit={submit}>
    <div class="col-span-2">
      <Field
        error={errors["service"]}
        hint="Например: «Содержание и ремонт», «Холодная вода»"
        label="Услуга"
        required
      >
        {#snippet children(attrs)}
          <input
            {...attrs}
            class={inputClass}
            list="services"
            maxlength="100"
            bind:value={form.service}
          />
          <datalist id="services">
            {#each services as s (s)}<option value={s}></option>{/each}
          </datalist>
        {/snippet}
      </Field>
    </div>
    <div class="col-span-2">
      <Field error={errors["calcMethod"]} label="Способ расчёта" required>
        {#snippet children(attrs)}
          <select {...attrs} class={inputClass} bind:value={form.calcMethod}>
            {#each toOptions(calcMethodLabels) as o (o.value)}
              <option value={o.value}>{o.label}</option>
            {/each}
          </select>
        {/snippet}
      </Field>
    </div>
    <div class="col-span-2">
      <Field error={errors["rate"]} label="Ставка, {calcMethodRateUnits[form.calcMethod]}" required>
        {#snippet children(attrs)}
          <input
            {...attrs}
            class={inputClass}
            inputmode="decimal"
            placeholder="30,00"
            bind:value={form.rate}
          />
        {/snippet}
      </Field>
    </div>
    <Field error={errors["validFrom"]} label="Дата начала действия" required>
      {#snippet children(attrs)}
        <input {...attrs} class={inputClass} type="date" bind:value={form.validFrom} />
      {/snippet}
    </Field>
    <Field error={errors["validTo"]} hint="Необязательно" label="Дата окончания">
      {#snippet children(attrs)}
        <input {...attrs} class={inputClass} type="date" bind:value={form.validTo} />
      {/snippet}
    </Field>
  </form>
  {#snippet footer()}
    <Button disabled={busy} onclick={() => (formOpen = false)} variant="secondary">Отмена</Button>
    <Button form="tariff-form" loading={busy} type="submit"
      >{editing ? "Сохранить" : "Добавить"}</Button
    >
  {/snippet}
</Modal>

<Modal busy={closeBusy} title="Закрыть тариф" bind:open={closeOpen}>
  <form id="close-form" class="flex flex-col gap-3" novalidate onsubmit={submitClose}>
    {#if closing}
      <p>
        {closing.service}: {formatMoney(closing.rate).replace(" ₽", "")}
        {calcMethodRateUnits[closing.calcMethod]}, с {formatDate(closing.validFrom)}
      </p>
    {/if}
    <Field error={closeErrors["validTo"]} label="Последний день действия" required>
      {#snippet children(attrs)}
        <input {...attrs} class={inputClass} type="date" bind:value={closeDate} />
      {/snippet}
    </Field>
  </form>
  {#snippet footer()}
    <Button disabled={closeBusy} onclick={() => (closeOpen = false)} variant="secondary"
      >Отмена</Button
    >
    <Button form="close-form" loading={closeBusy} type="submit">Закрыть тариф</Button>
  {/snippet}
</Modal>

<ConfirmDialog
  confirmLabel="Удалить"
  danger
  message={`Тариф «${deleting?.service ?? ""}» будет удалён.`}
  onconfirm={confirmDelete}
  title="Удалить тариф?"
  bind:open={deleteOpen}
/>
