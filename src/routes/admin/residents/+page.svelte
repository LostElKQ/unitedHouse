<!--
  3.4 Подтверждение жителей и управление пользователями.
  ФТ-4.1 заявки на подтверждение · 4.2 подтвердить · 4.3 отклонить с причиной
  4.4 список с поиском и фильтрами · 4.5 блокировка · 4.6 роль администратора
  4.7 учётные записи исполнителей
-->
<script lang="ts">
  import { invalidate } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { UserPlus } from "@lucide/svelte";
  import { api, ApiError, type FieldErrors } from "#lib/api/client.js";
  import type { UserRow } from "#lib/api/types.js";
  import Button from "#lib/components/ui/Button.svelte";
  import Card from "#lib/components/ui/Card.svelte";
  import ConfirmDialog from "#lib/components/ui/ConfirmDialog.svelte";
  import EmptyState from "#lib/components/ui/EmptyState.svelte";
  import Field from "#lib/components/ui/Field.svelte";
  import Modal from "#lib/components/ui/Modal.svelte";
  import PageHeader from "#lib/components/ui/PageHeader.svelte";
  import Pagination from "#lib/components/ui/Pagination.svelte";
  import StatusBadge from "#lib/components/ui/StatusBadge.svelte";
  import {
    inputClass,
    mobileListClass,
    tableClass,
    tdClass,
    thClass,
  } from "#lib/components/ui/styles.js";
  import Tabs from "#lib/components/ui/Tabs.svelte";
  import { toast } from "#lib/components/ui/toast.svelte.js";
  import { formatDate, formatPhoneInput } from "#lib/format.js";
  import { toOptions, userRoleLabels, userStatusLabels } from "#lib/labels.js";
  import { executorSchema, rejectSchema } from "#lib/schemas.js";
  import { validate } from "#lib/validation.js";
  import type { PageProps } from "./$types";

  let { data }: PageProps = $props();

  let tz = $derived(data.hoa.timezone);
  let meId = $derived(data.user?.id);

  function listHref(params: Record<string, string | number>): ReturnType<typeof resolve> {
    const qs = new URLSearchParams(
      Object.entries(params)
        .filter(([, v]) => v !== "" && v !== undefined)
        .map(([k, v]) => [k, String(v)]),
    ).toString();
    return resolve(`/admin/residents?${qs}`);
  }

  // --- действия ---------------------------------------------------------

  let busyId: number | null = $state(null);

  async function run(id: number, action: () => Promise<unknown>, success: string): Promise<void> {
    busyId = id;
    try {
      await action();
      toast.success(success);
      await invalidate("app:users");
    } catch (e) {
      toast.error(e instanceof ApiError ? e.userMessage : "Не удалось выполнить действие");
    } finally {
      busyId = null;
    }
  }

  function approve(u: UserRow): Promise<void> {
    return run(
      u.id,
      () => api.post(`/api/users/${u.id}/approve`),
      `${u.name}: регистрация подтверждена`,
    );
  }

  // Отклонение с причиной (ФТ-4.3)
  let rejectTarget: UserRow | null = $state(null);
  let rejectOpen = $state(false);
  let rejectReason = $state("");
  let rejectErrors: FieldErrors = $state({});
  let rejectBusy = $state(false);

  function openReject(u: UserRow): void {
    rejectTarget = u;
    rejectReason = "";
    rejectErrors = {};
    rejectOpen = true;
  }

  async function submitReject(e: SubmitEvent): Promise<void> {
    e.preventDefault();
    if (!rejectTarget) return;
    const v = validate(rejectSchema, { reason: rejectReason });
    if (!v.ok) {
      rejectErrors = v.errors;
      return;
    }
    rejectBusy = true;
    try {
      await api.post(`/api/users/${rejectTarget.id}/reject`, v.data);
      toast.success(`${rejectTarget.name}: регистрация отклонена`);
      rejectOpen = false;
      await invalidate("app:users");
    } catch (err) {
      if (err instanceof ApiError) {
        rejectErrors = err.fieldErrors;
        if (!err.fieldErrors["reason"]) toast.error(err.userMessage);
      }
    } finally {
      rejectBusy = false;
    }
  }

  // Блокировка и роль — через подтверждение
  type Pending = {
    title: string;
    message: string;
    label: string;
    danger: boolean;
    run: () => Promise<void>;
  };
  let confirm: Pending | null = $state(null);
  let confirmOpen = $state(false);

  function ask(p: Pending): void {
    confirm = p;
    confirmOpen = true;
  }

  function askBlock(u: UserRow): void {
    const blocking = u.status === "active";
    ask({
      title: blocking ? "Заблокировать пользователя?" : "Разблокировать пользователя?",
      message: blocking
        ? `${u.name} не сможет войти в систему.`
        : `${u.name} снова сможет входить в систему.`,
      label: blocking ? "Заблокировать" : "Разблокировать",
      danger: blocking,
      run: () =>
        run(
          u.id,
          () => api.patch(`/api/users/${u.id}/status`, { status: blocking ? "blocked" : "active" }),
          blocking ? "Пользователь заблокирован" : "Пользователь разблокирован",
        ),
    });
  }

  function askRole(u: UserRow): void {
    const toAdmin = u.role !== "admin";
    ask({
      title: toAdmin ? "Назначить администратором?" : "Снять роль администратора?",
      message: toAdmin
        ? `${u.name} получит доступ ко всем разделам управления ТСЖ.`
        : `${u.name} станет обычным жителем.`,
      label: toAdmin ? "Назначить" : "Снять роль",
      danger: !toAdmin,
      run: () =>
        run(
          u.id,
          () => api.patch(`/api/users/${u.id}/role`, { role: toAdmin ? "admin" : "resident" }),
          toAdmin ? "Роль администратора назначена" : "Роль администратора снята",
        ),
    });
  }

  // Новый исполнитель (ФТ-4.7)
  let execOpen = $state(false);
  let exec = $state({ name: "", email: "", phone: "", password: "" });
  let execErrors: FieldErrors = $state({});
  let execBusy = $state(false);

  function openExecutor(): void {
    exec = { name: "", email: "", phone: "", password: generatePassword() };
    execErrors = {};
    execOpen = true;
  }

  function generatePassword(): string {
    const letters = "abcdefghjkmnpqrstuvwxyz";
    const digits = "23456789";
    const pick = (s: string): string => s[Math.floor(Math.random() * s.length)] ?? "a";
    let p = "";
    for (let i = 0; i < 6; i++) p += pick(letters);
    return p + pick(digits) + pick(digits);
  }

  async function submitExecutor(e: SubmitEvent): Promise<void> {
    e.preventDefault();
    const v = validate(executorSchema, exec);
    if (!v.ok) {
      execErrors = v.errors;
      return;
    }
    execBusy = true;
    try {
      await api.post("/api/users/executors", v.data);
      toast.success(`Исполнитель создан. Временный пароль: ${exec.password}`);
      execOpen = false;
      await invalidate("app:users");
    } catch (err) {
      if (err instanceof ApiError) {
        execErrors = err.fieldErrors;
        if (Object.keys(err.fieldErrors).length === 0) toast.error(err.userMessage);
      }
    } finally {
      execBusy = false;
    }
  }
</script>

<PageHeader description="Подтверждение регистрации и учётные записи" title="Жители">
  {#snippet actions()}
    <Button onclick={openExecutor} variant="secondary">
      <UserPlus class="size-5" aria-hidden="true" />
      Добавить исполнителя
    </Button>
  {/snippet}
</PageHeader>

<Tabs
  label="Списки пользователей"
  tabs={[
    {
      href: resolve("/admin/residents"),
      label: "На подтверждение",
      active: data.tab === "pending",
      count: data.pending.pagination.total,
    },
    {
      href: resolve("/admin/residents?tab=all"),
      label: "Все пользователи",
      active: data.tab === "all",
    },
  ]}
/>

{#if data.tab === "pending"}
  <Card class="p-4 sm:px-6" padded={false}>
    {#if data.pending.data.length === 0}
      <EmptyState text="Новых заявок на регистрацию нет" />
    {:else}
      <table class={tableClass}>
        <thead>
          <tr>
            <th class={thClass}>ФИО</th>
            <th class={thClass}>Квартира</th>
            <th class={thClass}>Email</th>
            <th class={thClass}>Телефон</th>
            <th class={thClass}>Дата регистрации</th>
            <th class={thClass}><span class="sr-only">Действия</span></th>
          </tr>
        </thead>
        <tbody>
          {#each data.pending.data as u (u.id)}
            <tr>
              <td class={[tdClass, "font-medium"]}>{u.name}</td>
              <td class={tdClass}>{u.apartmentNumber ?? "—"}</td>
              <td class={tdClass}>{u.email}</td>
              <td class={[tdClass, "whitespace-nowrap"]}>{u.phone ?? "—"}</td>
              <td class={tdClass}>{formatDate(u.createdAt, tz)}</td>
              <td class={[tdClass, "text-right whitespace-nowrap"]}>
                <Button loading={busyId === u.id} onclick={() => approve(u)} size="sm">
                  Подтвердить
                </Button>
                <Button onclick={() => openReject(u)} size="sm" variant="secondary">
                  Отклонить
                </Button>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>

      <ul class={mobileListClass}>
        {#each data.pending.data as u (u.id)}
          <li class="flex flex-col gap-2 py-4">
            <div>
              <p class="font-medium">{u.name}</p>
              <p class="text-muted">Квартира {u.apartmentNumber ?? "—"}</p>
            </div>
            <p class="text-sm">
              {u.email}{u.phone ? ` · ${u.phone}` : ""}<br />
              <span class="text-muted">Зарегистрирован {formatDate(u.createdAt, tz)}</span>
            </p>
            <div class="flex gap-2">
              <Button loading={busyId === u.id} onclick={() => approve(u)} size="sm">
                Подтвердить
              </Button>
              <Button onclick={() => openReject(u)} size="sm" variant="secondary">Отклонить</Button>
            </div>
          </li>
        {/each}
      </ul>
    {/if}
  </Card>
{:else if data.all}
  <form
    class="mb-4 grid gap-3 sm:grid-cols-[1fr_auto_auto_auto] sm:items-end"
    data-sveltekit-keepfocus
    method="GET"
  >
    <input name="tab" type="hidden" value="all" />
    <Field label="Поиск">
      {#snippet children(attrs)}
        <input
          {...attrs}
          name="q"
          class={inputClass}
          placeholder="ФИО или номер квартиры"
          type="search"
          value={data.filters.q}
        />
      {/snippet}
    </Field>
    <Field label="Статус">
      {#snippet children(attrs)}
        <select
          {...attrs}
          name="status"
          class={inputClass}
          onchange={(e) => e.currentTarget.form?.requestSubmit()}
          value={data.filters.status}
        >
          <option value="">Все статусы</option>
          {#each toOptions(userStatusLabels) as o (o.value)}
            <option value={o.value}>{o.label}</option>
          {/each}
        </select>
      {/snippet}
    </Field>
    <Field label="Роль">
      {#snippet children(attrs)}
        <select
          {...attrs}
          name="role"
          class={inputClass}
          onchange={(e) => e.currentTarget.form?.requestSubmit()}
          value={data.filters.role}
        >
          <option value="">Все роли</option>
          {#each toOptions(userRoleLabels) as o (o.value)}
            <option value={o.value}>{o.label}</option>
          {/each}
        </select>
      {/snippet}
    </Field>
    <Button type="submit" variant="secondary">Найти</Button>
  </form>

  <Card class="p-4 sm:px-6" padded={false}>
    {#if data.all.data.length === 0}
      <EmptyState text="Никого не нашлось. Измените поиск или фильтры" />
    {:else}
      <table class={tableClass}>
        <thead>
          <tr>
            <th class={thClass}>ФИО</th>
            <th class={thClass}>Кв.</th>
            <th class={thClass}>Контакты</th>
            <th class={thClass}>Роль</th>
            <th class={thClass}>Статус</th>
            <th class={thClass}><span class="sr-only">Действия</span></th>
          </tr>
        </thead>
        <tbody>
          {#each data.all.data as u (u.id)}
            <tr>
              <td class={[tdClass, "font-medium"]}>{u.name}</td>
              <td class={tdClass}>{u.apartmentNumber ?? "—"}</td>
              <td class={[tdClass, "text-sm"]}>
                {u.email}{#if u.phone}<br /><span class="whitespace-nowrap">{u.phone}</span>{/if}
              </td>
              <td class={tdClass}>{userRoleLabels[u.role]}</td>
              <td class={tdClass}>
                <StatusBadge kind="user" value={u.status} />
                {#if u.status === "rejected" && u.rejectionReason}
                  <p class="mt-1 max-w-56 text-sm text-muted">{u.rejectionReason}</p>
                {/if}
              </td>
              <td class={[tdClass, "text-right"]}>
                {@render rowActions(u)}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>

      <ul class={mobileListClass}>
        {#each data.all.data as u (u.id)}
          <li class="flex flex-col gap-2 py-4">
            <div class="flex items-start justify-between gap-2">
              <div>
                <p class="font-medium">{u.name}</p>
                <p class="text-sm text-muted">
                  {userRoleLabels[u.role]}{u.apartmentNumber ? ` · кв. ${u.apartmentNumber}` : ""}
                </p>
              </div>
              <StatusBadge kind="user" value={u.status} />
            </div>
            <p class="text-sm">{u.email}{u.phone ? ` · ${u.phone}` : ""}</p>
            {#if u.status === "rejected" && u.rejectionReason}
              <p class="text-sm text-muted">Причина: {u.rejectionReason}</p>
            {/if}
            <div class="flex flex-wrap gap-2">{@render rowActions(u)}</div>
          </li>
        {/each}
      </ul>

      <Pagination
        nextHref={listHref({ tab: "all", ...data.filters, page: data.all.pagination.page + 1 })}
        page={data.all.pagination.page}
        prevHref={listHref({ tab: "all", ...data.filters, page: data.all.pagination.page - 1 })}
        total={data.all.pagination.total}
        totalPages={data.all.pagination.totalPages}
      />
    {/if}
  </Card>
{/if}

{#snippet rowActions(u: UserRow)}
  <div class="inline-flex flex-wrap justify-end gap-2">
    {#if u.status === "pending"}
      <Button loading={busyId === u.id} onclick={() => approve(u)} size="sm">Подтвердить</Button>
      <Button onclick={() => openReject(u)} size="sm" variant="secondary">Отклонить</Button>
    {/if}
    {#if u.status === "active" && u.role !== "executor" && u.id !== meId}
      <Button disabled={busyId === u.id} onclick={() => askRole(u)} size="sm" variant="secondary">
        {u.role === "admin" ? "Снять роль администратора" : "Сделать администратором"}
      </Button>
    {/if}
    {#if (u.status === "active" && u.role !== "admin") || u.status === "blocked"}
      <Button disabled={busyId === u.id} onclick={() => askBlock(u)} size="sm" variant="ghost">
        {u.status === "blocked" ? "Разблокировать" : "Заблокировать"}
      </Button>
    {/if}
  </div>
{/snippet}

<Modal busy={rejectBusy} title="Отклонить регистрацию" bind:open={rejectOpen}>
  <form id="reject-form" class="flex flex-col gap-3" novalidate onsubmit={submitReject}>
    {#if rejectTarget}
      <p>{rejectTarget.name}, квартира {rejectTarget.apartmentNumber ?? "—"}</p>
    {/if}
    <Field
      error={rejectErrors["reason"]}
      hint="Пользователь увидит её при входе"
      label="Причина отклонения"
      required
    >
      {#snippet children(attrs)}
        <textarea {...attrs} class={inputClass} maxlength="500" rows="3" bind:value={rejectReason}
        ></textarea>
      {/snippet}
    </Field>
  </form>
  {#snippet footer()}
    <Button disabled={rejectBusy} onclick={() => (rejectOpen = false)} variant="secondary">
      Отмена
    </Button>
    <Button form="reject-form" loading={rejectBusy} type="submit" variant="danger">Отклонить</Button
    >
  {/snippet}
</Modal>

<Modal busy={execBusy} title="Новый исполнитель" bind:open={execOpen}>
  <form id="exec-form" class="flex flex-col gap-3" novalidate onsubmit={submitExecutor}>
    <Field error={execErrors["name"]} label="ФИО" required>
      {#snippet children(attrs)}
        <input {...attrs} class={inputClass} bind:value={exec.name} />
      {/snippet}
    </Field>
    <Field error={execErrors["email"]} hint="Используется для входа" label="Email" required>
      {#snippet children(attrs)}
        <input
          {...attrs}
          class={inputClass}
          inputmode="email"
          type="email"
          bind:value={exec.email}
        />
      {/snippet}
    </Field>
    <Field error={execErrors["phone"]} label="Телефон">
      {#snippet children(attrs)}
        <input
          {...attrs}
          class={inputClass}
          inputmode="tel"
          oninput={(e) => (exec.phone = formatPhoneInput(e.currentTarget.value))}
          placeholder="+7 (900) 000-00-00"
          value={exec.phone}
        />
      {/snippet}
    </Field>
    <Field
      error={execErrors["password"]}
      hint="Передайте исполнителю — при первом входе он сменит пароль"
      label="Временный пароль"
      required
    >
      {#snippet children(attrs)}
        <div class="flex gap-2">
          <input {...attrs} class={inputClass} autocomplete="off" bind:value={exec.password} />
          <Button onclick={() => (exec.password = generatePassword())} variant="secondary">
            Новый
          </Button>
        </div>
      {/snippet}
    </Field>
  </form>
  {#snippet footer()}
    <Button disabled={execBusy} onclick={() => (execOpen = false)} variant="secondary"
      >Отмена</Button
    >
    <Button form="exec-form" loading={execBusy} type="submit">Создать</Button>
  {/snippet}
</Modal>

{#if confirm}
  <ConfirmDialog
    confirmLabel={confirm.label}
    danger={confirm.danger}
    message={confirm.message}
    onconfirm={confirm.run}
    title={confirm.title}
    bind:open={confirmOpen}
  />
{/if}
