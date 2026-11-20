<!--
  3.6 Ведение реестра квартир.
  ФТ-6.1 поля · 6.2 начальные показания · 6.3 таблица с поиском и жителями
  6.4 редактирование · 6.5 удаление только без показаний и начислений
-->
<script lang="ts">
  import { invalidate } from "$app/navigation";
  import { Pencil, Plus, Trash2 } from "@lucide/svelte";
  import { api, ApiError, type FieldErrors } from "#lib/api/client.js";
  import type { ApartmentRow } from "#lib/api/types.js";
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
  import { formatArea, formatNumber, formatVolume } from "#lib/format.js";
  import { apartmentSchema, type ApartmentInput } from "#lib/schemas.js";
  import { validate } from "#lib/validation.js";
  import type { PageProps } from "./$types";

  let { data }: PageProps = $props();

  // --- форма ------------------------------------------------------------

  type FormState = { [K in keyof ApartmentInput]: string };

  const empty: FormState = {
    number: "",
    entrance: "",
    floor: "",
    area: "",
    accountNumber: "",
    initialCold: "0,000",
    initialHot: "0,000",
  };

  let formOpen = $state(false);
  let editing: ApartmentRow | null = $state(null);
  let form: FormState = $state({ ...empty });
  let errors: FieldErrors = $state({});
  let busy = $state(false);

  function openCreate(): void {
    editing = null;
    form = { ...empty };
    errors = {};
    formOpen = true;
  }

  function openEdit(a: ApartmentRow): void {
    editing = a;
    form = {
      number: a.number,
      entrance: String(a.entrance),
      floor: String(a.floor),
      area: formatNumber(a.area, 2).replace(/\s/g, ""),
      accountNumber: a.accountNumber,
      initialCold: formatNumber(a.initialCold, 3).replace(/\s/g, ""),
      initialHot: formatNumber(a.initialHot, 3).replace(/\s/g, ""),
    };
    errors = {};
    formOpen = true;
  }

  async function submit(e: SubmitEvent): Promise<void> {
    e.preventDefault();
    const v = validate(apartmentSchema, form);
    if (!v.ok) {
      errors = v.errors;
      return;
    }
    busy = true;
    try {
      if (editing) {
        await api.patch(`/api/apartments/${editing.id}`, form);
        toast.success(`Квартира ${v.data.number} сохранена`);
      } else {
        await api.post("/api/apartments", form);
        toast.success(`Квартира ${v.data.number} добавлена`);
      }
      formOpen = false;
      await invalidate("app:apartments");
    } catch (err) {
      if (err instanceof ApiError) {
        errors = err.fieldErrors;
        if (Object.keys(err.fieldErrors).length === 0) toast.error(err.userMessage);
      }
    } finally {
      busy = false;
    }
  }

  // --- удаление ---------------------------------------------------------

  let deleting: ApartmentRow | null = $state(null);
  let deleteOpen = $state(false);

  function askDelete(a: ApartmentRow): void {
    deleting = a;
    deleteOpen = true;
  }

  async function confirmDelete(): Promise<void> {
    if (!deleting) return;
    try {
      await api.delete(`/api/apartments/${deleting.id}`);
      toast.success(`Квартира ${deleting.number} удалена`);
      await invalidate("app:apartments");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.userMessage : "Не удалось удалить");
    }
  }

  function residentsText(a: ApartmentRow): string {
    return a.residents.map((r) => r.name + (r.status === "pending" ? " (ожидает)" : "")).join(", ");
  }
</script>

<PageHeader description="Квартиры дома и лицевые счета" title="Квартиры">
  {#snippet actions()}
    <Button onclick={openCreate}>
      <Plus class="size-5" aria-hidden="true" />
      Добавить квартиру
    </Button>
  {/snippet}
</PageHeader>

<form class="mb-4 flex gap-2" data-sveltekit-keepfocus method="GET">
  <div class="flex-1">
    <Field hideLabel label="Поиск по номеру или лицевому счёту">
      {#snippet children(attrs)}
        <input
          {...attrs}
          name="q"
          class={inputClass}
          placeholder="Номер квартиры или лицевой счёт"
          type="search"
          value={data.q}
        />
      {/snippet}
    </Field>
  </div>
  <Button type="submit" variant="secondary">Найти</Button>
</form>

<Card class="p-4 sm:px-6" padded={false}>
  {#if data.apartments.length === 0}
    <EmptyState text={data.q ? "Ничего не нашлось" : "Квартир пока нет"} />
  {:else}
    <table class={tableClass}>
      <thead>
        <tr>
          <th class={thClass}>№</th>
          <th class={thClass}>Подъезд</th>
          <th class={thClass}>Этаж</th>
          <th class={[thClass, "text-right"]}>Площадь</th>
          <th class={thClass}>Лицевой счёт</th>
          <th class={thClass}>Жители</th>
          <th class={thClass}><span class="sr-only">Действия</span></th>
        </tr>
      </thead>
      <tbody>
        {#each data.apartments as a (a.id)}
          <tr>
            <td class={[tdClass, "font-medium"]}>{a.number}</td>
            <td class={tdClass}>{a.entrance}</td>
            <td class={tdClass}>{a.floor}</td>
            <td class={[tdClass, "text-right whitespace-nowrap"]}>{formatArea(a.area)}</td>
            <td class={[tdClass, "font-mono text-sm"]}>{a.accountNumber}</td>
            <td class={[tdClass, "text-sm"]}>
              {#if a.residents.length}{residentsText(a)}{:else}<span class="text-muted">—</span
                >{/if}
            </td>
            <td class={[tdClass, "text-right whitespace-nowrap"]}>
              <Button
                aria-label="Изменить квартиру {a.number}"
                onclick={() => openEdit(a)}
                size="sm"
                variant="ghost"
              >
                <Pencil class="size-4" aria-hidden="true" />
              </Button>
              <Button
                aria-label="Удалить квартиру {a.number}"
                onclick={() => askDelete(a)}
                size="sm"
                variant="ghost"
              >
                <Trash2 class="size-4" aria-hidden="true" />
              </Button>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>

    <ul class={mobileListClass}>
      {#each data.apartments as a (a.id)}
        <li class="flex items-start justify-between gap-3 py-3">
          <div>
            <p class="font-medium">Квартира {a.number}</p>
            <p class="text-sm text-muted">
              Подъезд {a.entrance}, этаж {a.floor} · {formatArea(a.area)}
            </p>
            <p class="text-sm text-muted">ЛС {a.accountNumber}</p>
            {#if a.residents.length}<p class="mt-1 text-sm">{residentsText(a)}</p>{/if}
          </div>
          <div class="flex shrink-0">
            <Button
              aria-label="Изменить квартиру {a.number}"
              onclick={() => openEdit(a)}
              size="sm"
              variant="ghost"
            >
              <Pencil class="size-4" aria-hidden="true" />
            </Button>
            <Button
              aria-label="Удалить квартиру {a.number}"
              onclick={() => askDelete(a)}
              size="sm"
              variant="ghost"
            >
              <Trash2 class="size-4" aria-hidden="true" />
            </Button>
          </div>
        </li>
      {/each}
    </ul>
    <p class="mt-3 text-sm text-muted">Всего квартир: {data.apartments.length}</p>
  {/if}
</Card>

<Modal
  {busy}
  title={editing ? `Квартира ${editing.number}` : "Новая квартира"}
  bind:open={formOpen}
>
  <form id="apartment-form" class="grid grid-cols-2 gap-3" novalidate onsubmit={submit}>
    <Field error={errors["number"]} label="Номер квартиры" required>
      {#snippet children(attrs)}
        <input {...attrs} class={inputClass} maxlength="10" bind:value={form.number} />
      {/snippet}
    </Field>
    <Field error={errors["accountNumber"]} label="Лицевой счёт" required>
      {#snippet children(attrs)}
        <input
          {...attrs}
          class={inputClass}
          inputmode="numeric"
          maxlength="20"
          bind:value={form.accountNumber}
        />
      {/snippet}
    </Field>
    <Field error={errors["entrance"]} label="Подъезд" required>
      {#snippet children(attrs)}
        <input {...attrs} class={inputClass} inputmode="numeric" bind:value={form.entrance} />
      {/snippet}
    </Field>
    <Field error={errors["floor"]} label="Этаж" required>
      {#snippet children(attrs)}
        <input {...attrs} class={inputClass} inputmode="numeric" bind:value={form.floor} />
      {/snippet}
    </Field>
    <div class="col-span-2">
      <Field
        error={errors["area"]}
        hint={editing
          ? "Новая площадь применится только к неопубликованным начислениям"
          : undefined}
        label="Общая площадь, м²"
        required
      >
        {#snippet children(attrs)}
          <input
            {...attrs}
            class={inputClass}
            inputmode="decimal"
            placeholder="50,00"
            bind:value={form.area}
          />
        {/snippet}
      </Field>
    </div>
    <p class="col-span-2 text-sm text-muted">
      Начальные показания счётчиков — «предыдущие» для первого расчётного периода
    </p>
    <Field error={errors["initialCold"]} label="ХВС, м³" required>
      {#snippet children(attrs)}
        <input
          {...attrs}
          class={inputClass}
          disabled={editing?.hasData}
          inputmode="decimal"
          bind:value={form.initialCold}
        />
      {/snippet}
    </Field>
    <Field error={errors["initialHot"]} label="ГВС, м³" required>
      {#snippet children(attrs)}
        <input
          {...attrs}
          class={inputClass}
          disabled={editing?.hasData}
          inputmode="decimal"
          bind:value={form.initialHot}
        />
      {/snippet}
    </Field>
    {#if editing?.hasData}
      <p class="col-span-2 text-sm text-muted">
        Начальные показания не меняются: по квартире уже есть показания ({formatVolume(
          editing.initialCold,
        )} / {formatVolume(editing.initialHot)}).
      </p>
    {/if}
  </form>
  {#snippet footer()}
    <Button disabled={busy} onclick={() => (formOpen = false)} variant="secondary">Отмена</Button>
    <Button form="apartment-form" loading={busy} type="submit">
      {editing ? "Сохранить" : "Добавить"}
    </Button>
  {/snippet}
</Modal>

<ConfirmDialog
  confirmLabel="Удалить"
  danger
  message={deleting?.hasData
    ? `По квартире ${deleting.number} есть показания или начисления — удалить её нельзя.`
    : `Квартира ${deleting?.number ?? ""} будет удалена без возможности восстановления.`}
  onconfirm={confirmDelete}
  title="Удалить квартиру?"
  bind:open={deleteOpen}
/>
