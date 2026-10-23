import { error } from '@sveltejs/kit';
import { generateTemporaryPassword, hashPassword, resetPassword } from '#lib/server/auth.js';
import { requireInstanceAdmin } from '#lib/server/apiGuard.js';
import type { RequestHandler } from './$types';
import { db } from '#lib/server/db/index.js';
import { resetUserAuthRateLimitById } from '#lib/server/authRateLimit.js';

export const POST: RequestHandler = async ({ locals, params }) => {
	const admin = requireInstanceAdmin(locals);
	if (params.id === admin.id) throw error(400, '自分のパスワードはこの操作ではリセットできません。');
	const temporaryPassword = generateTemporaryPassword();
	const updated = resetPassword(params.id, await hashPassword(temporaryPassword));
	if (!updated) throw error(404, 'ユーザーが見つかりません。');
	resetUserAuthRateLimitById(params.id, db);
	return Response.json({ temporaryPassword });
};
