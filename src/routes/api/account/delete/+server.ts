import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { deleteUserAccount, verifyUserPassword } from '$lib/server/auth';
import { clearSessionCookie } from '$lib/server/sessionCookie';
import { requireRecentAuth, requireUser } from '$lib/server/apiGuard';
import type { RequestHandler } from './$types';
import { isAuthRateLimited, recordAuthFailure, resetUserAuthRateLimit } from '$lib/server/authRateLimit';

/**
 * 本人によるアカウント削除。password が送られてきたら試行制限込みで検証し、
 * 無ければ(パスキーのみのユーザーなど)直近の本人確認を求める。
 */
export const DELETE: RequestHandler = async ({ locals, request, cookies, getClientAddress }) => {
	const user = requireUser(locals);
	const body = await request.json().catch(() => null);
	const username = typeof body?.username === 'string' ? body.username.trim() : '';
	if (username !== user.username) throw error(400, 'ユーザー名の確認に失敗しました。');
	if (typeof body?.password === 'string') {
		const ip = getClientAddress();
		const limited = isAuthRateLimited(user.username, ip);
		if (limited || !(await verifyUserPassword(user.id, body.password, db))) {
			if (!limited) recordAuthFailure(user.username, ip);
			throw error(400, '現在のパスワードが正しくありません。');
		}
		resetUserAuthRateLimit(user.username);
	} else {
		requireRecentAuth(locals);
	}
	const result = deleteUserAccount(user.id, db);
	if (!result.ok) {
		if (result.error === 'owns_household') throw error(400, 'ownerになっている世帯のownerを先に委任してください。');
		if (result.error === 'last_super_admin') throw error(400, '最後のsuper_adminは削除できません。');
		throw error(404, 'ユーザーが見つかりません。');
	}
	clearSessionCookie(cookies);
	return json({ ok: true });
};
