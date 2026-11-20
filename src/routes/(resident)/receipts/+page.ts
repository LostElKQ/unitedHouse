import { api } from "#lib/api/client.js";
import type { ReceiptListItem } from "#lib/api/types.js";
import type { PageLoad } from "./$types";

export const load: PageLoad = async ({ fetch }) => ({
  receipts: await api.get<ReceiptListItem[]>("/api/my/receipts", { fetch }),
});
