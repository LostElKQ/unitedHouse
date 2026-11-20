import { requirePending } from "#lib/server/guards.js";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = ({ locals }) => {
  requirePending(locals);
};
