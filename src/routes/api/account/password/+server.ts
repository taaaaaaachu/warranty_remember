import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { requireRecentAuth, requireUser } from '$lib/server/apiGuard';
import { changePassword, hashPassword, SESSION_COOKIE, validatePassword, verifyCredentials } from '$lib/server/auth';
import { getCredentialSummary, passwordChangeCheck, removePassword } from '$lib/server/credentials';
import type { RequestHandler } from './$types';
import { isAuthRateLimited, recordAuthFailure, resetUserAuthRateLimit } from '$lib/server/authRateLimit';

/**
 * 本人によるパスワードの変更・設定。操作端末以外のセッションを無効化する。
 * 強制変更中は現在のパスワード不要。パスワードを持つユーザーは常に現在のパスワードが必須
 * (試行制限込みで検証)。パスワードのないユーザーの新規設定だけ、直近の本人確認で行う。
 */
export const POST: RequestHandler = async ({ locals, cookies, request, getClientAddress }) => {
	const user = requireUser(locals);
	const body = await request.json().catch(() => null);
	const currentPassword = typeof body?.currentPassword === 'string' ? body.currentPassword : '';
	const newPassword = typeof body?.newPassword === 'string' ? body.newPassword : '';
	const confirmPassword = typeof body?.confirmPassword === 'string' ? body.confirmPassword : '';
	const passwordError = validatePassword(newPassword);
	if (passwordError) throw error(400, passwordError);
	if (newPassword !== confirmPassword) throw error(400, '新しいパスワードと確認用パスワードが一致しません。');
	const check = passwordChangeCheck(user, getCredentialSummary(db, user.id).hasPassword);
	if (check === 'forced') {
		// 一時パスワードでログインした直後なので、現在のパスワードは求めない。
	} else if (check === 'current_password') {
		// パスワードを持つユーザーは、直近の本人確認があっても現在のパスワードを必須にする。
		if (!currentPassword) throw error(400, '現在のパスワードを入力してください。');
		if (currentPassword === newPassword) throw error(400, '現在のパスワードと異なるパスワードを設定してください。');
		const ip = getClientAddress();
		if (isAuthRateLimited(user.username, ip)) throw error(400, '現在のパスワードが違います。');
		if (!(await verifyCredentials(user.username, currentPassword))) {
			recordAuthFailure(user.username, ip);
			throw error(400, '現在のパスワードが違います。');
		}
		resetUserAuthRateLimit(user.username);
	} else {
		requireRecentAuth(locals);
	}
	const token = cookies.get(SESSION_COOKIE);
	if (!token) throw error(401, 'ログインが必要です。');
	changePassword(user.id, await hashPassword(newPassword), token);
	return json({ ok: true });
};

/** パスワードの削除(パスキーのみのユーザーにする)。パスキーが無ければ 409。 */
export const DELETE: RequestHandler = async ({ locals }) => {
	const user = requireRecentAuth(locals);
	const result = removePassword(db, user.id, user.sessionId);
	if (!result.ok) {
		if (result.error === 'last_credential') throw error(409, 'パスキーを登録してから削除してください。');
		throw error(404, 'パスワードは設定されていません。');
	}
	return json({ ok: true });
};
