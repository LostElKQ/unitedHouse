// ФТ-12.3: «Скачать PDF» — kvitanciya_<лицевой счёт>_<ГГГГ-ММ>.pdf
import { checkAuthAccess } from "#lib/server/helpers.js";
import { getReceipt, receiptFileName, renderReceiptPdf } from "#lib/server/receipts.js";
import { id as idSchema } from "#lib/schemas.js";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ locals, params }) => {
  const user = checkAuthAccess(locals, ["resident", "admin"]);
  const receipt = await getReceipt(idSchema.parse(params.id), user);
  const pdf = await renderReceiptPdf(receipt);
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${receiptFileName(receipt)}"`,
      "Cache-Control": "private, no-store",
    },
  });
};
