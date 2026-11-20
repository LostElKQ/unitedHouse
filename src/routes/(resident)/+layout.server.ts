import { requireRole } from "#lib/server/guards.js";
import type { LayoutServerLoad } from "./$types";

export const load: LayoutServerLoad = ({ locals, url }) => {
  requireRole(locals, url, "resident");
};
