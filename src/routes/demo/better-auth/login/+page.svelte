<script lang="ts">
  import { enhance } from "$app/forms";
  import type { ActionData } from "./$types";

  let { form }: { form: ActionData } = $props();
</script>

<h1>Login</h1>
<form action="?/signInEmail" method="post" use:enhance>
  <label>
    Email
    <input
      name="email"
      class="mt-1 rounded-md border border-gray-300 bg-white px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
      type="email"
    />
  </label>
  <label>
    Password
    <input
      name="password"
      class="mt-1 rounded-md border border-gray-300 bg-white px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
      type="password"
    />
  </label>
  <label>
    Name (for registration)
    <input
      name="name"
      class="mt-1 rounded-md border border-gray-300 bg-white px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
    />
  </label>
  <button class="rounded-md bg-blue-600 px-4 py-2 text-white transition hover:bg-blue-700"
    >Login</button
  >
  <button
    class="rounded-md bg-blue-600 px-4 py-2 text-white transition hover:bg-blue-700"
    formaction="?/signUpEmail">Register</button
  >
</form>
<p class="text-red-500">{form?.message ?? ""}</p>
