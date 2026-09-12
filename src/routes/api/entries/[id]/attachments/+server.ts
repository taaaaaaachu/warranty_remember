import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { getWarrantyEntry, addAttachment, listAttachments } from '$lib/server/warranty';
import { saveAttachmentFile } from '$lib/server/attachmentStorage';
import { requireHousehold } from '$lib/server/apiGuard';
import { canEditEntries } from '$lib/rbac';
import type { RequestHandler } from './$types';

const MAX_FILE_BYTES = 20 * 1024 * 1024;

export const GET: RequestHandler = ({ locals, params }) => {
	const { householdId } = requireHousehold(locals);
	if (!getWarrantyEntry(db, householdId, params.id)) throw error(404, '保証登録が見つかりません。');
	return json(listAttachments(db, params.id));
};

/** 添付画像をアップロードする。multipart/form-data の "files" フィールド(複数可)。 */
export const POST: RequestHandler = async ({ locals, params, request }) => {
	const { householdId, role } = requireHousehold(locals);
	if (!canEditEntries(role)) throw error(403, '権限がありません。');
	if (!getWarrantyEntry(db, householdId, params.id)) throw error(404, '保証登録が見つかりません。');

	const formData = await request.formData().catch(() => null);
	if (!formData) throw error(400, 'アップロード形式が不正です。');
	const files = formData.getAll('files').filter((f): f is File => f instanceof File && f.size > 0);
	if (files.length === 0) throw error(400, '画像ファイルを選択してください。');

	const created = [];
	for (const file of files) {
		if (file.size > MAX_FILE_BYTES) throw error(400, `${file.name} は20MBを超えています。`);
		if (!file.type.startsWith('image/')) throw error(400, `${file.name} は画像ファイルではありません。`);
		const buffer = Buffer.from(await file.arrayBuffer());
		const saved = await saveAttachmentFile(householdId, params.id, buffer);
		created.push(addAttachment(db, params.id, saved.relativePath, saved.mimeType));
	}
	return json(created, { status: 201 });
};
