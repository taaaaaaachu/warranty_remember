import { redirect } from '@sveltejs/kit';
import { db } from '#lib/server/db/index.js';
import { listWarrantyEntries } from '#lib/server/warranty.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals }) => {
	if (!locals.user) throw redirect(303, '/login');
	if (!locals.activeHousehold) return { entries: [] };
	return { entries: listWarrantyEntries(db, locals.activeHousehold.id, { archived: true }) };
};
