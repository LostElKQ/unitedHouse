<!--
  @component
  Обёртка поля формы: подпись, * для обязательных (СТ 6.1, Тр. 3),
  подсказка и сообщение об ошибке рядом с полем (СТ 5.1).
  Сам элемент ввода передаётся сниппетом и получает готовые атрибуты
  доступности (id, aria-invalid, aria-describedby).

  ```svelte
  <Field label="Email" required error={errors.email}>
    {#snippet children(attrs)}
      <input {...attrs} class={inputClass} name="email" type="email" bind:value={email} />
    {/snippet}
  </Field>
  ```
-->
<script lang="ts">
  import type { Snippet } from "svelte";

  export type FieldAttrs = {
    id: string;
    "aria-invalid": "true" | undefined;
    "aria-describedby": string | undefined;
    required: boolean;
  };

  type Props = {
    label: string;
    required?: boolean;
    /** Ошибка: строка или массив из fieldErrors API */
    error?: string | string[] | undefined;
    hint?: string;
    /** Скрыть подпись визуально (останется для экранного диктора) */
    hideLabel?: boolean;
    children: Snippet<[FieldAttrs]>;
  };

  let { label, required = false, error, hint, hideLabel = false, children }: Props = $props();

  const id = $props.id();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;

  let errorText = $derived(Array.isArray(error) ? error.join(". ") : error);

  let attrs: FieldAttrs = $derived({
    id,
    "aria-invalid": errorText ? "true" : undefined,
    "aria-describedby":
      [hint ? hintId : "", errorText ? errorId : ""].filter(Boolean).join(" ") || undefined,
    required,
  });
</script>

<div class="flex flex-col gap-1.5">
  <label class={["text-sm font-medium text-ink", hideLabel && "sr-only"]} for={id}>
    {label}
    {#if required}<span class="text-danger-fg" aria-hidden="true">*</span>{/if}
  </label>

  {@render children(attrs)}

  {#if hint}
    <p id={hintId} class="text-sm text-muted">{hint}</p>
  {/if}
  {#if errorText}
    <p id={errorId} class="text-sm text-danger-fg">{errorText}</p>
  {/if}
</div>
