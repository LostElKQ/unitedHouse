<!--
  ФТ-4.7: при первом входе исполнитель (и любой, кому администратор
  выдал временный пароль) обязан сменить пароль. После смены сервер
  снимает отметку mustChangePassword (хук в auth.ts), и guard отпускает
  пользователя на его главную.
-->
<script lang="ts">
  import { invalidateAll } from "$app/navigation";
  import { authClient } from "#lib/auth-client.js";
  import type { FieldErrors } from "#lib/api/client.js";
  import Button from "#lib/components/ui/Button.svelte";
  import Card from "#lib/components/ui/Card.svelte";
  import Field from "#lib/components/ui/Field.svelte";
  import LogoutButton from "#lib/components/ui/LogoutButton.svelte";
  import PageHeader from "#lib/components/ui/PageHeader.svelte";
  import { inputClass } from "#lib/components/ui/styles.js";
  import { toast } from "#lib/components/ui/toast.svelte.js";
  import { changePasswordSchema } from "#lib/schemas.js";
  import { validate } from "#lib/validation.js";

  const form = $state({ currentPassword: "", newPassword: "", newPasswordRepeat: "" });
  let errors: FieldErrors = $state({});
  let formError = $state("");
  let busy = $state(false);

  async function submit(e: SubmitEvent): Promise<void> {
    e.preventDefault();
    formError = "";
    const v = validate(changePasswordSchema, form);
    if (!v.ok) {
      errors = v.errors;
      return;
    }
    errors = {};
    busy = true;
    try {
      const { error } = await authClient.changePassword({
        currentPassword: v.data.currentPassword,
        newPassword: v.data.newPassword,
        revokeOtherSessions: true,
      });
      if (error) {
        if (error.status === 400 && /password/i.test(error.message ?? "")) {
          errors = { currentPassword: ["Неверный текущий пароль"] };
        } else {
          formError = error.message ?? "Не удалось сменить пароль";
        }
        return;
      }
      toast.success("Пароль изменён");
      await invalidateAll();
    } finally {
      busy = false;
    }
  }
</script>

<PageHeader
  description="Вам выдан временный пароль. Придумайте свой, чтобы продолжить."
  title="Смена пароля"
/>

<Card>
  <form class="flex flex-col gap-4" novalidate onsubmit={submit}>
    <Field error={errors["currentPassword"]} label="Временный пароль" required>
      {#snippet children(attrs)}
        <input
          {...attrs}
          class={inputClass}
          autocomplete="current-password"
          type="password"
          bind:value={form.currentPassword}
        />
      {/snippet}
    </Field>
    <Field
      error={errors["newPassword"]}
      hint="Не менее 8 символов, хотя бы одна буква и одна цифра"
      label="Новый пароль"
      required
    >
      {#snippet children(attrs)}
        <input
          {...attrs}
          class={inputClass}
          autocomplete="new-password"
          type="password"
          bind:value={form.newPassword}
        />
      {/snippet}
    </Field>
    <Field error={errors["newPasswordRepeat"]} label="Повтор нового пароля" required>
      {#snippet children(attrs)}
        <input
          {...attrs}
          class={inputClass}
          autocomplete="new-password"
          type="password"
          bind:value={form.newPasswordRepeat}
        />
      {/snippet}
    </Field>

    {#if formError}
      <p class="rounded-lg bg-danger-bg px-4 py-3 text-danger-fg" role="alert">{formError}</p>
    {/if}

    <Button block loading={busy} type="submit">Сменить пароль</Button>
  </form>
  <div class="mt-4 flex justify-center"><LogoutButton variant="ghost" /></div>
</Card>
