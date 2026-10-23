import { error } from '@sveltejs/kit';
import { db } from '#lib/server/db/index.js';
import { getAttachmentForHousehold } from '#lib/server/warranty.js';
import { readAttachmentFile } from '#lib/server/attachmentStorage.js';
import { requireHousehold } from '#lib/server/apiGuard.js';
import type { RequestHandler } from './$types';

/** 添付画像のバイト列を配信する。世帯の所有権を確認してから読む。 */
export const GET: RequestHandler = async ({ locals, params }) => {
	const { householdId } = requireHousehold(locals);
	const attachment = getAttachmentForHousehold(db, householdId, params.id);
	if (!attachment) throw error(404, '添付画像が見つかりません。');
	const buffer = await readAttachmentFile(attachment.filePath).catch(() => null);
	if (!buffer) throw error(404, '添付画像が見つかりません。');
	return new Response(new Uint8Array(buffer), {
		headers: { 'content-type': attachment.mimeType, 'cache-control': 'private, max-age=31536000, immutable' }
	});
};
