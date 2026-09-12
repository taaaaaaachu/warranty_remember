import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { getWarrantyEntry, updateWarrantyEntry, deleteWarrantyEntry, listAttachments } from '$lib/server/warranty';
import { deleteAttachmentFile } from '$lib/server/attachmentStorage';
import { requireHousehold } from '$lib/server/apiGuard';
import { canEditEntries } from '$lib/rbac';
import { validateWarrantyEntryInput, isWarrantyEntryInputError } from '$lib/server/inputValidation';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ locals, params }) => {
	const { householdId } = requireHousehold(locals);
	const entry = getWarrantyEntry(db, householdId, params.id);
	if (!entry) throw error(404, '保証登録が見つかりません。');
	return json({ ...entry, attachments: listAttachments(db, entry.id) });
};

export const PATCH: RequestHandler = async ({ locals, params, request }) => {
	const { householdId, role } = requireHousehold(locals);
	if (!canEditEntries(role)) throw error(403, '権限がありません。');
	const body = await request.json().catch(() => null);
	if (!body) throw error(400, '入力が不正です。');
	const input = validateWarrantyEntryInput(body);
	if (isWarrantyEntryInputError(input)) throw error(400, input.message);
	if (!updateWarrantyEntry(db, householdId, params.id, input)) throw error(404, '保証登録が見つかりません。');
	return json(getWarrantyEntry(db, householdId, params.id));
};

export const DELETE: RequestHandler = async ({ locals, params }) => {
	const { householdId, role } = requireHousehold(locals);
	if (!canEditEntries(role)) throw error(403, '権限がありません。');
	if (!getWarrantyEntry(db, householdId, params.id)) throw error(404, '保証登録が見つかりません。');
	const removedFiles = deleteWarrantyEntry(db, householdId, params.id);
	await Promise.all(removedFiles.map((file) => deleteAttachmentFile(file.filePath)));
	return new Response(null, { status: 204 });
};
