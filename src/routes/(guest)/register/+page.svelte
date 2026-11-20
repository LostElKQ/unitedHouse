<!--
  3.1 Регистрация пользователя (ФТ-1.1–1.7).
  Проверка на клиенте той же схемой, что и на сервере; ответы сервера
  (email занят, квартира не найдена) показываются у своих полей.
-->
<script lang="ts">
  import { resolve } from "$app/paths";
  import { CircleCheck } from "@lucide/svelte";
  import { api, ApiError, type FieldErrors } from "#lib/api/client.js";
  import Button from "#lib/components/ui/Button.svelte";
  import Card from "#lib/components/ui/Card.svelte";
  import Field from "#lib/components/ui/Field.svelte";
  import PageHeader from "#lib/components/ui/PageHeader.svelte";
  import { checkboxClass, inputClass } from "#lib/components/ui/styles.js";
  import { formatPhoneInput } from "#lib/format.js";
  import { registrationSchema } from "#lib/schemas.js";
  import { validate } from "#lib/validation.js";

  const form = $state({
    name: "",
    email: "",
    phone: "",
    apartmentNumber: "",
    password: "",
    passwordRepeat: "",
  });
  let consent = $state(false);
  let errors: FieldErrors = $state({});
  let formError = $state("");
  let busy = $state(false);
  let done = $state(false);

  async function submit(e: SubmitEvent): Promise<void> {
    e.preventDefault();
    formError = "";
    const v = validate(registrationSchema, { ...form, consent });
    if (!v.ok) {
      errors = v.errors;
      return;
    }
    errors = {};
    busy = true;
    try {
      await api.post("/api/registration", { ...form, consent });
      done = true;
    } catch (err) {
      if (err instanceof ApiError) {
        errors = err.fieldErrors;
        if (Object.keys(err.fieldErrors).length === 0) formError = err.userMessage;
      } else {
        formError = "Нет связи с сервером. Попробуйте ещё раз";
      }
    } finally {
      busy = false;
    }
  }
</script>

<PageHeader title="Регистрация" />

{#if done}
  <Card>
    <div class="flex flex-col items-center gap-3 py-4 text-center" role="status">
      <CircleCheck class="size-10 text-success-fg" aria-hidden="true" />
      <p class="text-lg font-medium">Заявка на регистрацию передана в правление ТСЖ</p>
      <p class="text-muted">
        Когда администратор подтвердит, что вы живёте в квартире {form.apartmentNumber}, вы сможете
        пользоваться всеми разделами. Войти можно уже сейчас.
      </p>
      <Button class="mt-2" href={resolve("/(guest)/login")}>Перейти ко входу</Button>
    </div>
  </Card>
{:else}
  <Card>
    <form class="flex flex-col gap-4" method="POST" novalidate onsubmit={submit}>
      <Field error={errors["name"]} hint="Например: Иванов Иван Иванович" label="ФИО" required>
        {#snippet children(attrs)}
          <input {...attrs} class={inputClass} autocomplete="name" bind:value={form.name} />
        {/snippet}
      </Field>

      <Field error={errors["email"]} label="Email" required>
        {#snippet children(attrs)}
          <input
            {...attrs}
            class={inputClass}
            autocomplete="email"
            inputmode="email"
            type="email"
            bind:value={form.email}
          />
        {/snippet}
      </Field>

      <Field error={errors["phone"]} label="Телефон">
        {#snippet children(attrs)}
          <input
            {...attrs}
            class={inputClass}
            autocomplete="tel"
            inputmode="tel"
            oninput={(e) => (form.phone = formatPhoneInput(e.currentTarget.value))}
            placeholder="+7 (900) 000-00-00"
            type="tel"
            value={form.phone}
          />
        {/snippet}
      </Field>

      <Field error={errors["apartmentNumber"]} label="Номер квартиры" required>
        {#snippet children(attrs)}
          <input {...attrs} class={inputClass} bind:value={form.apartmentNumber} />
        {/snippet}
      </Field>

      <Field
        error={errors["password"]}
        hint="Не менее 8 символов, хотя бы одна буква и одна цифра"
        label="Пароль"
        required
      >
        {#snippet children(attrs)}
          <input
            {...attrs}
            class={inputClass}
            autocomplete="new-password"
            type="password"
            bind:value={form.password}
          />
        {/snippet}
      </Field>

      <Field error={errors["passwordRepeat"]} label="Повтор пароля" required>
        {#snippet children(attrs)}
          <input
            {...attrs}
            class={inputClass}
            autocomplete="new-password"
            type="password"
            bind:value={form.passwordRepeat}
          />
        {/snippet}
      </Field>

      <label class="flex items-start gap-3">
        <input class={[checkboxClass, "mt-0.5"]} type="checkbox" bind:checked={consent} />
        <span>
          Я даю согласие на обработку персональных данных в соответствии с Федеральным законом №
          152-ФЗ
        </span>
      </label>

      {#if formError}
        <p class="rounded-lg bg-danger-bg px-4 py-3 text-danger-fg" role="alert">{formError}</p>
      {/if}

      <!-- ФТ-1.6: без согласия кнопка неактивна -->
      <Button block disabled={!consent} loading={busy} type="submit">Зарегистрироваться</Button>
    </form>

    <p class="mt-6 text-center text-muted">
      Уже зарегистрированы?
      <a class="font-medium text-graphite underline" href={resolve("/(guest)/login")}>Войти</a>
    </p>
  </Card>
{/if}
