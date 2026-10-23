import { fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { createSession, hashPassword, validatePassword } from '$lib/server/auth';
import { setSessionCookie } from '$lib/server/sessionCookie';
import { resetUserAuthRateLimitById } from '$lib/server/authRateLimit';
import { consumeResetLink, findResetLink, RESET_LINK_INVALID } from '$lib/server/resetLinks';
import type { Actions, PageServerLoad } from './$types';

/** リセットリンク(docs/adr/0003)。別のユーザーでログイン中でも開ける。 */
export const load: PageServerLoad = ({ params }) => {
	return { username: findResetLink(db, params.token)?.username ?? null };
};

export const actions: Actions = {
	/** 新しいパスワードを設定してログインする(パスキーは /api/passkey/register で行う)。 */
	default: async ({ params, request, cookies }) => {
		const data = await request.formData();
		const password = String(data.get('password') ?? '');
		if (password !== String(data.get('password2') ?? '')) {
			return fail(400, { error: '新しいパスワードと確認用パスワードが一致しません。' });
		}
		const pErr = validatePassword(password);
		if (pErr) return fail(400, { error: pErr });

		const userId = consumeResetLink(db, params.token, { passwordHash: await hashPassword(password) });
		if (!userId) return fail(410, { error: RESET_LINK_INVALID });
		resetUserAuthRateLimitById(userId, db);

		const { token, expiresAt } = createSession(userId);
		setSessionCookie(cookies, token, expiresAt);
		throw redirect(303, '/');
	}
};
