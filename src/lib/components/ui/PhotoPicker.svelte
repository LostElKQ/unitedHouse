<!--
  @component
  Выбор фото: JPG или PNG до 5 МБ, не больше max штук (ФТ-14.4, ФТ-16.5).
  На телефоне браузер сам предложит камеру или галерею (СТ 5.3).
  Проверка — сразу при выборе; сервер проверит ещё раз по содержимому.
-->
<script lang="ts">
  import { ImagePlus, X } from "@lucide/svelte";
  import { checkPhotos, PHOTO_TYPES } from "#lib/schemas.js";

  type Props = {
    files: File[];
    max: number;
    label?: string;
    /** Ошибка от сервера */
    error?: string | string[] | undefined;
  };

  let { files = $bindable(), max, label = "Фото", error }: Props = $props();

  const inputId = $props.id();
  let localError = $state("");
  let previews = $derived(files.map((f) => ({ file: f, url: URL.createObjectURL(f) })));

  $effect(() => {
    const urls = previews.map((p) => p.url);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  });

  function add(e: Event & { currentTarget: HTMLInputElement }): void {
    const picked = Array.from(e.currentTarget.files ?? []);
    e.currentTarget.value = "";
    const problem = checkPhotos(picked, Infinity) ?? checkPhotos([...files, ...picked], max);
    if (problem) {
      localError = problem;
      // подходящие файлы всё равно добавляем, пока есть место
      const ok = picked.filter((f) => checkPhotos([f], 1) === null);
      files = [...files, ...ok].slice(0, max);
      return;
    }
    localError = "";
    files = [...files, ...picked];
  }

  function remove(i: number): void {
    files = files.filter((_, j) => j !== i);
    localError = "";
  }

  let errorText = $derived(localError || (Array.isArray(error) ? error.join(". ") : (error ?? "")));
</script>

<div class="flex flex-col gap-2">
  <span class="text-sm font-medium">{label}</span>
  <div class="flex flex-wrap gap-2">
    {#each previews as p, i (p.url)}
      <div class="relative">
        <img
          class="size-20 rounded-lg border border-line object-cover"
          alt="Выбранное фото {i + 1}"
          src={p.url}
        />
        <button
          class="absolute -top-2 -right-2 rounded-full border border-line bg-surface p-1 shadow hover:bg-page"
          aria-label="Убрать фото {i + 1}"
          onclick={() => remove(i)}
          type="button"
        >
          <X class="size-4" aria-hidden="true" />
        </button>
      </div>
    {/each}
    {#if files.length < max}
      <label
        class="flex size-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-graphite text-sm text-graphite focus-within:outline-2 focus-within:outline-graphite hover:bg-page"
        for={inputId}
      >
        <ImagePlus class="size-6" aria-hidden="true" />
        Добавить
      </label>
    {/if}
  </div>
  <input
    id={inputId}
    class="sr-only"
    accept={PHOTO_TYPES.join(",")}
    aria-describedby="{inputId}-hint"
    multiple
    onchange={add}
    type="file"
  />
  <p id="{inputId}-hint" class="text-sm text-muted">
    До {max} фото, JPG или PNG, не больше 5 МБ каждое. Выбрано: {files.length}
  </p>
  {#if errorText}<p class="text-sm text-danger-fg" role="alert">{errorText}</p>{/if}
</div>
