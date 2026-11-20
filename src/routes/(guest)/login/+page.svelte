<!--
  3.2 Авторизация.
  ФТ-2.2: общее сообщение «Неверный email или пароль».
  ФТ-2.3: после 5 ошибок подряд — блокировка на 15 минут (сообщение с сервера).
  ФТ-2.5: отклонённый или заблокированный видит причину и контакт правления.
  ФТ-2.4: после входа сервер сам отправляет на главную по роли
  (redirectIfSignedIn в +page.server.ts), поэтому здесь — invalidateAll().
-->
<script lang="ts">
  import { invalidateAll } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { authClient } from "#lib/auth-client.js";
  import type { FieldErrors } from "#lib/api/client.js";
  import Button from "#lib/components/ui/Button.svelte";
  import Card from "#lib/components/ui/Card.svelte";
  import Field from "#lib/components/ui/Field.svelte";
  import PageHeader from "#lib/components/ui/PageHeader.svelte";
  import { inputClass } from "#lib/components/ui/styles.js";
  import { loginSchema } from "#lib/schemas.js";
  import { validate } from "#lib/validation.js";
  import type { PageProps } from "./$types";

  let { data }: PageProps = $props();

  let email = $state("");
  let password = $state("");
  let errors: FieldErrors = $state({});
  let formError = $state("");
  let showBoardPhone = $state(false);
  let busy = $state(false);

  let boardPhone = $derived(data.hoa.boardPhone);

  async function submit(e: SubmitEvent): Promise<void> {
    e.preventDefault();
    formError = "";
    showBoardPhone = false;
    const v = validate(loginSchema, { email, password });
    if (!v.ok) {
      errors = v.errors;
      return;
    }
    errors = {};
    busy = true;
    try {
      const { error } = await authClient.signIn.email(v.data);
      if (error) {
        if (error.status === 401) {
          formError = "Неверный email или пароль";
        } else if (error.status === 403) {
          formError = error.message ?? "Вход запрещён";
          showBoardPhone = true;
        } else if (error.status === 429) {
          formError = error.message?.startsWith("Вход")
            ? error.message
            : "Слишком много попыток. Попробуйте позже";
        } else {
          formError = "Не удалось войти. Попробуйте ещё раз";
        }
        return;
      }
      await invalidateAll();
    } catch {
      formError = "Нет связи с сервером. Проверьте интернет и попробуйте ещё раз";
    } finally {
      busy = false;
    }
  }
</script>

<PageHeader title="Вход" />

<Card>
  <form class="flex flex-col gap-4" method="POST" novalidate onsubmit={submit}>
    <Field error={errors["email"]} label="Email" required>
      {#snippet children(attrs)}
        <input
          {...attrs}
          class={inputClass}
          autocomplete="email"
          inputmode="email"
          type="email"
          bind:value={email}
        />
      {/snippet}
    </Field>

    <Field error={errors["password"]} label="Пароль" required>
      {#snippet children(attrs)}
        <input
          {...attrs}
          class={inputClass}
          autocomplete="current-password"
          type="password"
          bind:value={password}
        />
      {/snippet}
    </Field>

    {#if formError}
      <div class="rounded-lg bg-danger-bg px-4 py-3 text-danger-fg" role="alert">
        <p>{formError}</p>
        {#if showBoardPhone && boardPhone}
          <p class="mt-1">
            Телефон правления:
            <a class="font-medium underline" href="tel:{boardPhone.replace(/[^\d+]/g, '')}">
              {boardPhone}
            </a>
          </p>
        {/if}
      </div>
    {/if}

    <Button block loading={busy} type="submit">Войти</Button>
  </form>

  <p class="mt-6 text-center text-muted">
    Нет учётной записи?
    <a class="font-medium text-graphite underline" href={resolve("/(guest)/register")}>
      Регистрация
    </a>
  </p>
</Card>
