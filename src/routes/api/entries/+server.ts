import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { createWarrantyEntry, listWarrantyEntries } from '$lib/server/warranty';
import { requireHousehold } from '$lib/server/apiGuard';
import { canEditEntries } from '$lib/rbac';
import { validateWarrantyEntryInput, isWarrantyEntryInputError } from '$lib/server/inputValidation';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ locals, url }) => {
	const { householdId } = requireHousehold(locals);
	const archived = url.searchParams.get('archived') === '1';
	const category = url.searchParams.get('category') ?? undefined;
	const query = url.searchParams.get('q') ?? undefined;
	return json(listWarrantyEntries(db, householdId, { archived, category, query }));
};

export const POST: RequestHandler = async ({ locals, request }) => {
	const { householdId, role } = requireHousehold(locals);
	if (!canEditEntries(role)) throw error(403, '権限がありません。');
	const body = await request.json().catch(() => null);
	if (!body) throw error(400, '入力が不正です。');
	const input = validateWarrantyEntryInput(body);
	if (isWarrantyEntryInputError(input)) throw error(400, input.message);
	const entry = createWarrantyEntry(db, householdId, input);
	return json(entry, { status: 201 });
};
