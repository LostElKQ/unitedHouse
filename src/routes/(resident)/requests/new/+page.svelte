<!--
  3.14 Создание заявки жителем.
  ФТ-14.1 категория · 14.2 место и уточнение · 14.3 описание 10–2000
  14.4 до 3 фото · 14.5 «Срочно» · 14.6 предупреждение и телефон
  аварийной службы · 14.7 номер и статус «Новая».
  СТ 6.1 Тр. 2: создать заявку за 3 минуты.
-->
<script lang="ts">
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { ArrowLeft, Phone, TriangleAlert } from "@lucide/svelte";
  import { api, ApiError, type FieldErrors } from "#lib/api/client.js";
  import Button from "#lib/components/ui/Button.svelte";
  import Card from "#lib/components/ui/Card.svelte";
  import Field from "#lib/components/ui/Field.svelte";
  import PageHeader from "#lib/components/ui/PageHeader.svelte";
  import PhotoPicker from "#lib/components/ui/PhotoPicker.svelte";
  import { checkboxClass, inputClass } from "#lib/components/ui/styles.js";
  import { toast } from "#lib/components/ui/toast.svelte.js";
  import { categoryLabels, requestLocationLabels, toOptions } from "#lib/labels.js";
  import { checkPhotos, requestSchema, type RequestInput } from "#lib/schemas.js";
  import { validate } from "#lib/validation.js";
  import type { PageProps } from "./$types";

  let { data }: PageProps = $props();

  const form: { [K in keyof RequestInput]-?: K extends "urgent" ? boolean : string } = $state({
    category: "",
    location: "",
    locationDetail: "",
    description: "",
    urgent: false,
  });
  let photos: File[] = $state([]);
  let errors: FieldErrors = $state({});
  let busy = $state(false);

  let phone = $derived(data.hoa.emergencyPhone);

  async function submit(e: SubmitEvent): Promise<void> {
    e.preventDefault();
    const v = validate(requestSchema, form);
    const photoError = checkPhotos(photos, 3);
    if (!v.ok || photoError) {
      errors = { ...(v.ok ? {} : v.errors), ...(photoError ? { photos: [photoError] } : {}) };
      if (!v.ok) {
        const ids: Record<string, string> = {
          category: "category",
          location: "location",
          description: "description",
        };
        const first = Object.keys(v.errors).find((k) => ids[k]);
        if (first) document.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
      }
      return;
    }
    errors = {};
    const body = new FormData();
    body.set("category", form.category);
    body.set("location", form.location);
    body.set("locationDetail", form.locationDetail);
    body.set("description", form.description);
    body.set("urgent", String(form.urgent));
    for (const f of photos) body.append("photos", f);

    busy = true;
    try {
      const created = await api.post<{ id: number; number: number }>("/api/my/requests", body);
      toast.success(`Заявка №${created.number} отправлена`);
      await goto(resolve("/(resident)/requests"), { invalidateAll: true });
    } catch (err) {
      if (err instanceof ApiError) {
        errors = err.fieldErrors;
        if (Object.keys(err.fieldErrors).length === 0) toast.error(err.userMessage);
      } else {
        toast.error("Нет связи с сервером. Попробуйте ещё раз");
      }
    } finally {
      busy = false;
    }
  }
</script>

<Button class="mb-3 -ml-3" href={resolve("/(resident)/requests")} size="sm" variant="ghost">
  <ArrowLeft class="size-4" aria-hidden="true" /> Мои заявки
</Button>
<PageHeader title="Новая заявка" />

<div class="mx-auto flex max-w-2xl flex-col gap-4">
  <!-- ФТ-14.6, СТ 6.4 Тр. 5 -->
  <div
    class="flex gap-3 rounded-xl border border-danger-fg/30 bg-danger-bg px-4 py-3 text-danger-fg"
    role="note"
  >
    <TriangleAlert class="mt-0.5 size-5 shrink-0" aria-hidden="true" />
    <div>
      <p>
        При аварии (прорыв трубы, запах газа, отсутствие света во всём доме) звоните в аварийную
        службу
      </p>
      {#if phone}
        <a
          class="mt-1 inline-flex items-center gap-2 text-lg font-medium underline"
          href="tel:{phone.replace(/[^\d+]/g, '')}"
        >
          <Phone class="size-5" aria-hidden="true" />{phone}
        </a>
      {/if}
    </div>
  </div>

  <Card>
    <form class="flex flex-col gap-4" method="POST" novalidate onsubmit={submit}>
      <Field error={errors["category"]} label="Категория" required>
        {#snippet children(attrs)}
          <select {...attrs} name="category" class={inputClass} bind:value={form.category}>
            <option disabled value="">Выберите категорию</option>
            {#each toOptions(categoryLabels) as o (o.value)}
              <option value={o.value}>{o.label}</option>
            {/each}
          </select>
        {/snippet}
      </Field>

      <div class="grid gap-4 sm:grid-cols-2">
        <Field error={errors["location"]} label="Место" required>
          {#snippet children(attrs)}
            <select {...attrs} name="location" class={inputClass} bind:value={form.location}>
              <option disabled value="">Где проблема?</option>
              {#each toOptions(requestLocationLabels) as o (o.value)}
                <option value={o.value}>{o.label}</option>
              {/each}
            </select>
          {/snippet}
        </Field>
        <Field error={errors["locationDetail"]} label="Уточнение места">
          {#snippet children(attrs)}
            <input
              {...attrs}
              name="locationDetail"
              class={inputClass}
              maxlength="100"
              placeholder="Например: 3-й подъезд, 5-й этаж"
              bind:value={form.locationDetail}
            />
          {/snippet}
        </Field>
      </div>

      <Field
        error={errors["description"]}
        hint="{form.description.trim().length} из 2000, минимум 10"
        label="Описание проблемы"
        required
      >
        {#snippet children(attrs)}
          <textarea
            {...attrs}
            name="description"
            class={inputClass}
            maxlength="2000"
            placeholder="Что случилось и с какого времени"
            rows="5"
            bind:value={form.description}></textarea>
        {/snippet}
      </Field>

      <PhotoPicker
        error={errors["photos"]}
        label="Фото (необязательно)"
        max={3}
        bind:files={photos}
      />

      <label class="flex items-start gap-3">
        <input class={[checkboxClass, "mt-0.5"]} type="checkbox" bind:checked={form.urgent} />
        <span>
          Срочно
          <span class="block text-sm text-muted"
            >Окончательный приоритет установит правление ТСЖ</span
          >
        </span>
      </label>

      <Button block loading={busy} size="lg" type="submit">Отправить</Button>
    </form>
  </Card>
</div>
