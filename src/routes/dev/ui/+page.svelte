<!--
  Витрина компонентов интерфейса: http://localhost:5173/dev/ui
  Открывается только в режиме разработки. Смотрите сюда, прежде чем
  писать новую кнопку или бейдж, — скорее всего, он уже есть.
-->
<script lang="ts">
  import Button from "#lib/components/ui/Button.svelte";
  import Card from "#lib/components/ui/Card.svelte";
  import ConfirmDialog from "#lib/components/ui/ConfirmDialog.svelte";
  import Field from "#lib/components/ui/Field.svelte";
  import PageHeader from "#lib/components/ui/PageHeader.svelte";
  import StatusBadge from "#lib/components/ui/StatusBadge.svelte";
  import { checkboxClass, inputClass } from "#lib/components/ui/styles.js";
  import { toast } from "#lib/components/ui/toast.svelte.js";
  import {
    formatArea,
    formatDate,
    formatMoney,
    formatPeriod,
    formatPhoneInput,
    formatVolume,
  } from "#lib/format.js";
  import { categoryLabels, toOptions } from "#lib/labels.js";

  let confirmOpen = $state(false);
  let phone = $state("");
  let reading = $state("99,000");
  let busy = $state(false);

  async function fakeSave(): Promise<void> {
    busy = true;
    await new Promise((r) => setTimeout(r, 800));
    busy = false;
    toast.success("Показания отправлены");
  }
</script>

<div class="mx-auto max-w-4xl px-4 py-8">
  <PageHeader description="Компоненты интерфейса «Единый дом»" title="Витрина">
    {#snippet actions()}
      <Button onclick={() => toast.error("Не удалось сохранить")} variant="secondary">
        Ошибка
      </Button>
      <Button onclick={() => toast.success("Сохранено")}>Уведомление</Button>
    {/snippet}
  </PageHeader>

  <div class="flex flex-col gap-6">
    <Card title="Кнопки">
      <div class="flex flex-wrap gap-3">
        <Button>Основная</Button>
        <Button variant="secondary">Второстепенная</Button>
        <Button variant="danger">Удалить</Button>
        <Button variant="ghost">Тихая</Button>
        <Button disabled>Недоступна</Button>
        <Button loading={busy} onclick={fakeSave}>Отправить</Button>
      </div>
      <div class="mt-4 flex flex-col gap-3 sm:flex-row">
        <Button block size="lg">Начать</Button>
        <Button block size="lg" variant="secondary">Выполнено</Button>
      </div>
    </Card>

    <Card title="Статусы">
      <div class="flex flex-col gap-3">
        <div class="flex flex-wrap gap-2">
          <StatusBadge kind="work" value="planned" />
          <StatusBadge kind="work" value="in_progress" />
          <StatusBadge kind="work" value="done" />
          <StatusBadge kind="work" value="rescheduled" />
          <StatusBadge kind="overdue" />
          <StatusBadge kind="work" value="cancelled" />
        </div>
        <div class="flex flex-wrap gap-2">
          <StatusBadge kind="request" value="new" />
          <StatusBadge kind="request" value="in_progress" />
          <StatusBadge kind="request" value="done" />
          <StatusBadge kind="request" value="rejected" />
        </div>
        <div class="flex flex-wrap gap-2">
          <StatusBadge kind="period" value="readings_open" />
          <StatusBadge kind="period" value="readings_closed" />
          <StatusBadge kind="period" value="charges_formed" />
          <StatusBadge kind="period" value="published" />
        </div>
        <div class="flex flex-wrap gap-2">
          <StatusBadge kind="payment" value="unpaid" />
          <StatusBadge kind="payment" value="partially_paid" />
          <StatusBadge kind="payment" value="paid" />
          <StatusBadge kind="user" value="pending" />
          <StatusBadge kind="user" value="blocked" />
        </div>
      </div>
    </Card>

    <Card title="Поля формы">
      <form class="grid gap-4 sm:grid-cols-2" onsubmit={(e) => e.preventDefault()}>
        <Field label="ФИО" required>
          {#snippet children(attrs)}
            <input {...attrs} class={inputClass} autocomplete="name" />
          {/snippet}
        </Field>
        <Field hint="Необязательно" label="Телефон">
          {#snippet children(attrs)}
            <input
              {...attrs}
              class={inputClass}
              inputmode="tel"
              oninput={(e) => (phone = formatPhoneInput(e.currentTarget.value))}
              placeholder="+7 (900) 000-00-00"
              value={phone}
            />
          {/snippet}
        </Field>
        <Field
          error="Текущее показание не может быть меньше предыдущего (100,000)"
          label="ХВС, м³"
          required
        >
          {#snippet children(attrs)}
            <input {...attrs} class={inputClass} inputmode="decimal" bind:value={reading} />
          {/snippet}
        </Field>
        <Field label="Категория" required>
          {#snippet children(attrs)}
            <select {...attrs} class={inputClass}>
              {#each toOptions(categoryLabels) as o (o.value)}
                <option value={o.value}>{o.label}</option>
              {/each}
            </select>
          {/snippet}
        </Field>
        <div class="sm:col-span-2">
          <Field label="Описание" required>
            {#snippet children(attrs)}
              <textarea {...attrs} class={inputClass} rows="3"></textarea>
            {/snippet}
          </Field>
        </div>
        <label class="flex items-center gap-2 sm:col-span-2">
          <input class={checkboxClass} type="checkbox" />
          Согласен на обработку персональных данных
        </label>
      </form>
    </Card>

    <Card title="Форматы (раздел 7)">
      <dl class="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1">
        <dt class="text-muted">Сумма</dt>
        <dd>{formatMoney(2295.65)}</dd>
        <dt class="text-muted">Объём</dt>
        <dd>{formatVolume(5)}</dd>
        <dt class="text-muted">Площадь</dt>
        <dd>{formatArea(72.4)}</dd>
        <dt class="text-muted">Дата</dt>
        <dd>{formatDate("2026-11-15")}</dd>
        <dt class="text-muted">Период</dt>
        <dd>{formatPeriod(2026, 10)}</dd>
      </dl>
    </Card>

    <Card title="Подтверждение">
      <Button onclick={() => (confirmOpen = true)}>Опубликовать квитанции</Button>
    </Card>
  </div>
</div>

<ConfirmDialog
  confirmLabel="Опубликовать"
  message="После публикации показания и начисления октября изменить будет нельзя."
  onconfirm={() =>
    new Promise((r) => setTimeout(r, 800)).then(() => toast.success("Квитанции опубликованы"))}
  title="Опубликовать квитанции?"
  bind:open={confirmOpen}
/>
