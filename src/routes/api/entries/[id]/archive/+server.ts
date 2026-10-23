import { error } from '@sveltejs/kit';
import { db } from '#lib/server/db/index.js';
import { archiveWarrantyEntry, unarchiveWarrantyEntry } from '#lib/server/warranty.js';
import { requireHousehold } from '#lib/server/apiGuard.js';
import { canEditEntries } from '#lib/rbac.js';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = ({ locals, params }) => {
	const { householdId, role } = requireHousehold(locals);
	if (!canEditEntries(role)) throw error(403, '権限がありません。');
	if (!archiveWarrantyEntry(db, householdId, params.id)) throw error(404, '保証登録が見つからないか、既にアーカイブ済みです。');
	return Response.json({ ok: true });
};

export const DELETE: RequestHandler = ({ locals, params }) => {
	const { householdId, role } = requireHousehold(locals);
	if (!canEditEntries(role)) throw error(403, '権限がありません。');
	if (!unarchiveWarrantyEntry(db, householdId, params.id)) throw error(404, '保証登録が見つからないか、アーカイブされていません。');
	return Response.json({ ok: true });
};
