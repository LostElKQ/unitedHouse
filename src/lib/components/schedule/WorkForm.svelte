<!--
  @component
  Форма работы по дому (ФТ-16.1): название, тип, категория, место,
  дата и время, исполнитель (из списка или подрядчик текстом),
  описание, приоритет для внеплановых, связанная заявка.
-->
<script lang="ts">
  import type { FieldErrors } from "#lib/api/client.js";
  import type { OpenRequest, UserRow, WorkDetail } from "#lib/api/types.js";
  import Field from "#lib/components/ui/Field.svelte";
  import { inputClass } from "#lib/components/ui/styles.js";
  import {
    categoryLabels,
    priorityLabels,
    toOptions,
    workLocationLabels,
    workTypeLabels,
  } from "#lib/labels.js";
  import { workSchema, type WorkInput } from "#lib/schemas.js";
  import { validate } from "#lib/validation.js";

  type FormValues = { [K in keyof WorkInput]-?: string };

  type Props = {
    id: string;
    initial: WorkDetail | null;
    date: string;
    executors: UserRow[];
    requests: OpenRequest[];
    entrances: number[];
    onsave: (values: FormValues) => Promise<FieldErrors | void>;
  };

  let { id, initial, date, executors, requests, entrances, onsave }: Props = $props();

  // svelte-ignore state_referenced_locally
  const w = initial;
  const v: FormValues = $state({
    title: w?.title ?? "",
    type: w?.type ?? "planned",
    category: w?.category ?? "cleaning",
    location: w?.location ?? "whole_house",
    locationDetail: w?.locationDetail ?? "",
    entrance: w?.entrance ? String(w.entrance) : "",
    // svelte-ignore state_referenced_locally
    workDate: w?.workDate ?? date,
    timeStart: w?.timeStart ?? "",
    timeEnd: w?.timeEnd ?? "",
    executorId: w?.executorId ? String(w.executorId) : "",
    contractor: w?.contractor ?? "",
    description: w?.description ?? "",
    priority: w?.priority ?? "",
    requestId: w?.requestId ? String(w.requestId) : "",
  });
  let executorMode: "staff" | "contractor" = $state(w?.contractor ? "contractor" : "staff");
  let errors: FieldErrors = $state({});

  // Дату существующей работы меняют только переносом (ФТ-16.3)
  let dateLocked = $derived(!!w && (w.status !== "planned" || w.reschedules.length > 0));

  function pickRequest(e: Event & { currentTarget: HTMLSelectElement }): void {
    const r = requests.find((x) => String(x.id) === e.currentTarget.value);
    if (!r) return;
    // ФТ-15.6: категория, место и описание — из заявки
    v.category = r.category;
    v.type = "unplanned";
    v.priority = r.priority;
    if (!v.title) v.title = `${categoryLabels[r.category]}: заявка №${r.number}`;
    if (!v.description) v.description = r.description;
    if (
      r.location === "entrance" ||
      r.location === "basement" ||
      r.location === "roof" ||
      r.location === "yard"
    ) {
      v.location = r.location;
    } else {
      v.location = "other";
    }
    if (!v.locationDetail)
      v.locationDetail = [
        r.location === "apartment" ? `кв. ${r.apartmentNumber}` : null,
        r.locationDetail,
      ]
        .filter(Boolean)
        .join(", ")
        .slice(0, 100);
  }

  async function submit(e: SubmitEvent): Promise<void> {
    e.preventDefault();
    const values = {
      ...v,
      executorId: executorMode === "staff" ? v.executorId : "",
      contractor: executorMode === "contractor" ? v.contractor : "",
    };
    const res = validate(workSchema, values);
    if (!res.ok) {
      errors = res.errors;
      return;
    }
    errors = (await onsave(values)) ?? {};
  }
</script>

<form {id} class="grid gap-3 sm:grid-cols-2" novalidate onsubmit={submit}>
  {#if requests.length > 0 || v.requestId}
    <div class="sm:col-span-2">
      <Field
        error={errors["requestId"]}
        hint="Необязательно. Заполнит категорию, место и описание"
        label="По заявке"
      >
        {#snippet children(attrs)}
          <select {...attrs} class={inputClass} onchange={pickRequest} bind:value={v.requestId}>
            <option value="">Без заявки</option>
            {#if w?.requestId && !requests.some((r) => r.id === w.requestId)}
              <option value={String(w.requestId)}>Заявка №{w.requestNumber}</option>
            {/if}
            {#each requests as r (r.id)}
              <option value={String(r.id)}>
                №{r.number}, кв. {r.apartmentNumber} — {categoryLabels[r.category]}{r.priority ===
                "urgent"
                  ? " (срочно)"
                  : ""}
              </option>
            {/each}
          </select>
        {/snippet}
      </Field>
    </div>
  {/if}

  <div class="sm:col-span-2">
    <Field error={errors["title"]} label="Название" required>
      {#snippet children(attrs)}
        <input
          {...attrs}
          class={inputClass}
          maxlength="150"
          placeholder="Например: Уборка 1-го подъезда"
          bind:value={v.title}
        />
      {/snippet}
    </Field>
  </div>

  <Field error={errors["type"]} label="Тип" required>
    {#snippet children(attrs)}
      <select {...attrs} class={inputClass} bind:value={v.type}>
        {#each toOptions(workTypeLabels) as o (o.value)}<option value={o.value}>{o.label}</option
          >{/each}
      </select>
    {/snippet}
  </Field>
  <Field error={errors["category"]} label="Категория" required>
    {#snippet children(attrs)}
      <select {...attrs} class={inputClass} bind:value={v.category}>
        {#each toOptions(categoryLabels) as o (o.value)}<option value={o.value}>{o.label}</option
          >{/each}
      </select>
    {/snippet}
  </Field>

  {#if v.type === "unplanned"}
    <div class="sm:col-span-2">
      <Field error={errors["priority"]} label="Приоритет">
        {#snippet children(attrs)}
          <select {...attrs} class={inputClass} bind:value={v.priority}>
            <option value="">Не указан</option>
            {#each toOptions(priorityLabels) as o (o.value)}<option value={o.value}
                >{o.label}</option
              >{/each}
          </select>
        {/snippet}
      </Field>
    </div>
  {/if}

  <Field error={errors["location"]} label="Место" required>
    {#snippet children(attrs)}
      <select {...attrs} class={inputClass} bind:value={v.location}>
        {#each toOptions(workLocationLabels) as o (o.value)}<option value={o.value}
            >{o.label}</option
          >{/each}
      </select>
    {/snippet}
  </Field>
  {#if v.location === "entrance"}
    <Field error={errors["entrance"]} label="Подъезд" required>
      {#snippet children(attrs)}
        <select {...attrs} class={inputClass} bind:value={v.entrance}>
          <option disabled value="">Выберите</option>
          {#each entrances as e (e)}<option value={String(e)}>{e}-й подъезд</option>{/each}
        </select>
      {/snippet}
    </Field>
  {/if}
  <div class={v.location === "entrance" ? "sm:col-span-2" : ""}>
    <Field error={errors["locationDetail"]} label="Уточнение места">
      {#snippet children(attrs)}
        <input
          {...attrs}
          class={inputClass}
          maxlength="100"
          placeholder="Например: 5-й этаж"
          bind:value={v.locationDetail}
        />
      {/snippet}
    </Field>
  </div>

  <div class="sm:col-span-2">
    <Field
      error={errors["workDate"]}
      hint={dateLocked ? "Дату меняют кнопкой «Перенести» с причиной" : undefined}
      label="Дата"
      required
    >
      {#snippet children(attrs)}
        <input
          {...attrs}
          class={inputClass}
          disabled={dateLocked}
          type="date"
          bind:value={v.workDate}
        />
      {/snippet}
    </Field>
  </div>
  <Field error={errors["timeStart"]} label="Время начала">
    {#snippet children(attrs)}
      <input {...attrs} class={inputClass} type="time" bind:value={v.timeStart} />
    {/snippet}
  </Field>
  <Field error={errors["timeEnd"]} label="Время окончания">
    {#snippet children(attrs)}
      <input {...attrs} class={inputClass} type="time" bind:value={v.timeEnd} />
    {/snippet}
  </Field>

  <fieldset class="flex flex-col gap-2 sm:col-span-2">
    <legend class="mb-1 text-sm font-medium">Исполнитель</legend>
    <div class="flex flex-wrap gap-4">
      <label class="flex items-center gap-2">
        <input
          class="size-4 accent-graphite"
          type="radio"
          value="staff"
          bind:group={executorMode}
        /> Работник ТСЖ
      </label>
      <label class="flex items-center gap-2">
        <input
          class="size-4 accent-graphite"
          type="radio"
          value="contractor"
          bind:group={executorMode}
        /> Сторонний подрядчик
      </label>
    </div>
    {#if executorMode === "staff"}
      <Field error={errors["executorId"]} hideLabel label="Работник ТСЖ">
        {#snippet children(attrs)}
          <select {...attrs} class={inputClass} bind:value={v.executorId}>
            <option value="">Не назначен</option>
            {#each executors as u (u.id)}<option value={String(u.id)}>{u.name}</option>{/each}
          </select>
        {/snippet}
      </Field>
    {:else}
      <Field error={errors["contractor"]} hideLabel label="Подрядчик">
        {#snippet children(attrs)}
          <input
            {...attrs}
            class={inputClass}
            maxlength="100"
            placeholder="Например: ООО «Лифтсервис»"
            bind:value={v.contractor}
          />
        {/snippet}
      </Field>
    {/if}
  </fieldset>

  <div class="sm:col-span-2">
    <Field error={errors["description"]} label="Описание">
      {#snippet children(attrs)}
        <textarea {...attrs} class={inputClass} maxlength="2000" rows="3" bind:value={v.description}
        ></textarea>
      {/snippet}
    </Field>
  </div>
</form>
