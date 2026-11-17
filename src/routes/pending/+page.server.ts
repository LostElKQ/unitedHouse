import { db } from '#lib/server/db/index.js';
import { apartments, hoaSettings } from '#lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

// ФТ-2.5: экран ожидания подтверждения
export const load: PageServerLoad = async ({ locals }) => {
	const [s] = await db.select({ phone: hoaSettings.boardPhone }).from(hoaSettings).limit(1);
	const aptId = locals.user?.apartmentId;
	const [apt] = aptId
		? await db.select({ number: apartments.number }).from(apartments).where(eq(apartments.id, aptId))
		: [];
	return { boardPhone: s?.phone ?? null, apartment: apt?.number ?? null };
};
