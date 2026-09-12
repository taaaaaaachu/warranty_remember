import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { createHousehold, listHouseholdSummaries } from '$lib/server/households';
import { requireInstanceAdmin } from '$lib/server/apiGuard';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ locals }) => {
	requireInstanceAdmin(locals);
	return json(listHouseholdSummaries(db));
};

export const POST: RequestHandler = async ({ locals, request }) => {
	requireInstanceAdmin(locals);
	const body = await request.json().catch(() => null);
	const name = typeof body?.name === 'string' ? body.name.trim() : '';
	if (!name) throw error(400, '世帯名は必須です。');
	const household = createHousehold(db, name);
	return json({ id: household.id, name: household.name }, { status: 201 });
};
