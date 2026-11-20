<!--
  @component
  Кнопка или ссылка-кнопка (СТ 5.1): основная — графитовая с белым текстом,
  второстепенная — белая с графитовой рамкой.

  ```svelte
  <Button onclick={save}>Сохранить</Button>
  <Button variant="secondary" href={resolve("/admin")}>Отмена</Button>
  <Button loading={busy} type="submit">Отправить</Button>
  ```
-->
<script lang="ts">
  import type { Snippet } from "svelte";
  import type { HTMLAnchorAttributes, HTMLButtonAttributes } from "svelte/elements";
  import { LoaderCircle } from "@lucide/svelte";

  type Variant = "primary" | "secondary" | "danger" | "ghost";
  type Size = "sm" | "md" | "lg";

  type Common = {
    variant?: Variant;
    size?: Size;
    /** Растянуть на всю ширину (удобно на телефоне) */
    block?: boolean;
    loading?: boolean;
    children: Snippet;
  };

  type Props =
    | (Common & HTMLButtonAttributes & { href?: undefined })
    | (Common & HTMLAnchorAttributes & { href: string });

  let {
    variant = "primary",
    size = "md",
    block = false,
    loading = false,
    children,
    class: className = "",
    ...rest
  }: Props = $props();

  const variants: Record<Variant, string> = {
    primary: "bg-graphite text-white hover:bg-graphite-hover border border-graphite",
    secondary: "bg-surface text-graphite border border-graphite hover:bg-page",
    danger: "bg-danger-fg text-white border border-danger-fg hover:opacity-90",
    ghost: "bg-transparent text-graphite border border-transparent hover:bg-neutral-bg",
  };

  const sizes: Record<Size, string> = {
    sm: "min-h-9 px-3 text-sm",
    md: "min-h-10 px-4 text-base",
    lg: "min-h-14 px-6 text-lg", // крупные кнопки исполнителя (ФТ-18.6)
  };

  let classes = $derived(
    [
      "inline-flex items-center justify-center gap-2 rounded-lg font-medium whitespace-nowrap transition-colors",
      "disabled:cursor-not-allowed disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50",
      variants[variant],
      sizes[size],
      block ? "w-full" : "",
      className,
    ].join(" "),
  );
</script>

{#if rest.href !== undefined}
  <a class={classes} {...rest as HTMLAnchorAttributes}>
    {@render children()}
  </a>
{:else}
  {@const buttonRest = rest as HTMLButtonAttributes}
  <button
    class={classes}
    type="button"
    {...buttonRest}
    aria-busy={loading || undefined}
    disabled={buttonRest.disabled || loading}
  >
    {#if loading}
      <LoaderCircle class="size-4 animate-spin" aria-hidden="true" />
    {/if}
    {@render children()}
  </button>
{/if}
