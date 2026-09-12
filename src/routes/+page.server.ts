import { redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { listWarrantyEntries } from '$lib/server/warranty';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals, url }) => {
	if (!locals.user) throw redirect(303, '/login');
	if (!locals.activeHousehold) return { entries: [], categories: [], category: '', query: '' };

	const category = url.searchParams.get('category') ?? '';
	const query = url.searchParams.get('q') ?? '';
	const householdId = locals.activeHousehold.id;

	const all = listWarrantyEntries(db, householdId, { archived: false });
	const categories = [...new Set(all.map((e) => e.category).filter((c): c is string => !!c))].sort();
	const entries = listWarrantyEntries(db, householdId, {
		archived: false,
		category: category || undefined,
		query: query || undefined
	});

	return { entries, categories, category, query };
};
