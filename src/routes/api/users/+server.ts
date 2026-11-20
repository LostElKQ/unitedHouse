import { db } from "#lib/server/db/index.js";
import { apartments, users } from "#lib/server/db/schema.js";
import { checkAuthAccess, parseSearchParams } from "#lib/server/helpers.js";
import { and, asc, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import z from "zod";
import type { RequestHandler } from "./$types";

const searchParamsSchema = z.strictObject({
  status: z.enum(["pending", "active", "rejected", "blocked"]).optional(),
  role: z.enum(["resident", "admin", "executor"]).optional(),
  // ФТ-4.4: поиск по ФИО и номеру квартиры
  q: z.string().trim().max(150).optional(),
  page: z.coerce.number().positive().default(1),
  pageSize: z.coerce.number().positive().max(40).default(20),
});

export const GET: RequestHandler = async ({ locals, url }) => {
  checkAuthAccess(locals, ["admin"]);

  const { role, page, pageSize, status, q } = parseSearchParams(
    url.searchParams,
    searchParamsSchema,
  );

  const filters: Array<SQL | undefined> = [];
  if (role) filters.push(eq(users.role, role));
  if (status) filters.push(eq(users.status, status));
  if (q) {
    const like = `%${q.replace(/[%_\\]/g, (c) => `\\${c}`)}%`;
    filters.push(or(ilike(users.name, like), sql`lower(${apartments.number}) = lower(${q})`));
  }

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
      rejectionReason: users.rejectionReason,
      createdAt: users.createdAt,
      pdConsentAt: users.pdConsentAt,
    })
    .from(users)
    .where(and(...filters))
    .leftJoin(apartments, eq(users.apartmentId, apartments.id))
    // заявки на подтверждение — от старых к новым, остальные — по ФИО
    .orderBy(status === "pending" ? asc(users.createdAt) : asc(users.name), desc(users.id))
    .limit(pageSize)
    .offset(pageSize * (page - 1));

  const [{ total } = { total: 0 }] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(users)
    .leftJoin(apartments, eq(users.apartmentId, apartments.id))
    .where(and(...filters));

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
