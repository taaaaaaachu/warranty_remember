import { json, error } from '@sveltejs/kit';
import { generateTemporaryPassword, hashPassword, resetPassword } from '$lib/server/auth';
import { requireInstanceAdmin } from '$lib/server/apiGuard';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { resetUserAuthRateLimitById } from '$lib/server/authRateLimit';

export const POST: RequestHandler = async ({ locals, params }) => {
	const admin = requireInstanceAdmin(locals);
	if (params.id === admin.id) throw error(400, '自分のパスワードはこの操作ではリセットできません。');
	const temporaryPassword = generateTemporaryPassword();
	const updated = resetPassword(params.id, await hashPassword(temporaryPassword));
	if (!updated) throw error(404, 'ユーザーが見つかりません。');
	resetUserAuthRateLimitById(params.id, db);
	return json({ temporaryPassword });
};
