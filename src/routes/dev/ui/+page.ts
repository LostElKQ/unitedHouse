import { dev } from "$app/env";
import { error } from "@sveltejs/kit";
import type { PageLoad } from "./$types";

// Витрина компонентов — только при `npm run dev`, в сборке её нет.
export const load: PageLoad = () => {
  if (!dev) error(404);
};
