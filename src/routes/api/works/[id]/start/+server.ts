// ФТ-16.2, ФТ-18.3: «Начать» — работа «В работе»
import { audit, badRequest } from "#lib/server/api-helpers.js";
import { db } from "#lib/server/db/index.js";
import { works } from "#lib/server/db/schema.js";
import { checkAuthAccess } from "#lib/server/helpers.js";
import { canPerform, getWork } from "#lib/server/works.js";
import { id as idSchema } from "#lib/schemas.js";
import { error } from "@sveltejs/kit";
import { eq } from "drizzle-orm";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ locals, params }) => {
  const user = checkAuthAccess(locals, ["admin", "executor"]);
  const id = idSchema.parse(params.id);
  const w = await getWork(id, user);
  if (!canPerform(user, w.executorId)) error(403);
  if (w.status !== "planned" && w.status !== "rescheduled")
    badRequest({}, ["Начать можно только запланированную или перенесённую работу"]);

  await db
    .update(works)
    .set({ status: "in_progress", updatedAt: new Date() })
    .where(eq(works.id, id));
  await audit(Number(user.id), "work.start", "work", id);
  return Response.json({ id, status: "in_progress" });
};
