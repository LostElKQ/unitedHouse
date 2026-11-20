<!--
  @component
  Кнопка «Выйти» (ФТ-2.6). После выхода — на страницу входа.
-->
<script lang="ts">
  import { goto, invalidateAll } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { LogOut } from "@lucide/svelte";
  import { authClient } from "#lib/auth-client.js";
  import Button from "./Button.svelte";
  import { toast } from "./toast.svelte.ts";

  let { variant = "secondary" }: { variant?: "primary" | "secondary" | "ghost" } = $props();

  let busy = $state(false);

  async function logout(): Promise<void> {
    busy = true;
    try {
      await authClient.signOut();
      await invalidateAll();
      await goto(resolve("/(guest)/login"));
    } catch {
      toast.error("Не удалось выйти. Попробуйте ещё раз");
    } finally {
      busy = false;
    }
  }
</script>

<Button loading={busy} onclick={logout} {variant}>
  <LogOut class="size-5" aria-hidden="true" />
  Выйти
</Button>
