import { error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { getWarrantyEntry, deleteAttachment } from '$lib/server/warranty';
import { deleteAttachmentFile } from '$lib/server/attachmentStorage';
import { requireHousehold } from '$lib/server/apiGuard';
import { canEditEntries } from '$lib/rbac';
import type { RequestHandler } from './$types';

export const DELETE: RequestHandler = async ({ locals, params }) => {
	const { householdId, role } = requireHousehold(locals);
	if (!canEditEntries(role)) throw error(403, '権限がありません。');
	if (!getWarrantyEntry(db, householdId, params.id)) throw error(404, '保証登録が見つかりません。');
	const removed = deleteAttachment(db, params.id, params.attachmentId);
	if (!removed) throw error(404, '添付画像が見つかりません。');
	await deleteAttachmentFile(removed.filePath);
	return new Response(null, { status: 204 });
};
