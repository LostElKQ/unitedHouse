import { db } from "#lib/server/db/index.js";
import { apartments, users } from "#lib/server/db/schema.js";
import { parseSearchParams } from "#lib/server/helpers.js";
import { error } from "@sveltejs/kit";
import { and, eq, type SQL } from "drizzle-orm";
import z from "zod";
import type { RequestHandler } from "./$types";

const searchParamsSchema = z.strictObject({
  status: z.enum(["pending", "active", "rejected", "blocked"]).optional(),
  role: z.enum(["resident", "admin", "executor"]).optional(),
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(40).default(20),
});

export const GET: RequestHandler = async ({ locals: { user }, url }) => {
  if (!user) return error(401);
  if (user.role !== "admin") return error(403);

  const { role, page, pageSize, status } = parseSearchParams(url.searchParams, searchParamsSchema);

  const filters: Array<SQL | undefined> = [];
  if (role) filters.push(eq(users.role, role));
  if (status) filters.push(eq(users.status, status));

  const usersData = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      phone: users.phone,
      role: users.role,
      status: users.status,
      apartmentId: users.apartmentId,
      apartmentNumber: apartments.number,
      createdAt: users.createdAt,
      pdConsentAt: users.pdConsentAt,
    })
    .from(users)
    .where(and(...filters))
    .leftJoin(apartments, eq(users.apartmentId, apartments.id))
    .orderBy(users.id)
    .limit(pageSize)
    .offset(pageSize * (page - 1));

  const total = await db.$count(users, and(...filters));

  return Response.json({
    data: usersData,
    pagination: {
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    },
  });
};
