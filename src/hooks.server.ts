import { redirect } from '@sveltejs/kit';
import type { Handle } from '@sveltejs/kit/hooks';
import { SESSION_COOKIE, validateSessionToken, invalidateSession } from '#lib/server/auth.js';
import { HOUSEHOLD_COOKIE } from '#lib/server/sessionCookie.js';
import { db } from '#lib/server/db/index.js';
import { listUserHouseholds } from '#lib/server/households.js';
import { dev } from '$app/env';
import { allowedWithTemporaryPassword } from '#lib/server/apiGuard.js';

function cookieOpts(expires: Date) {
	return { path: '/', httpOnly: true, sameSite: 'lax' as const, secure: !dev, expires };
}

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.user = null;
	event.locals.session = null;
	event.locals.households = [];
	event.locals.activeHousehold = null;

	const token = event.cookies.get(SESSION_COOKIE);
	if (token) {
		const result = validateSessionToken(token);
		if (result) {
			event.locals.user = result.user;
			event.locals.session = result.session;
			// 仮パスワードのユーザーは、変更を済ませるまで他のページ・API を使えない(docs/adr/0003)。
			if (result.user.mustChangePassword) {
				const pathname = event.url.pathname;
				if (!allowedWithTemporaryPassword(pathname)) {
					if (pathname.startsWith('/api/'))
						return new Response(JSON.stringify({ message: 'パスワード変更が必要です。' }), {
							status: 403,
							headers: { 'content-type': 'application/json' }
						});
					throw redirect(303, '/account?password=required');
				}
			}
			if (result.renewedExpiresAt) {
				event.cookies.set(SESSION_COOKIE, token, cookieOpts(new Date(result.renewedExpiresAt)));
			}
		} else {
			invalidateSession(token);
			event.cookies.delete(SESSION_COOKIE, { path: '/' });
		}
	}

	if (event.locals.user) {
		const households = listUserHouseholds(db, event.locals.user.id);
		event.locals.households = households;

		// 現在の世帯を Cookie から解決。所属していなければ先頭にフォールバック。
		const wanted = event.cookies.get(HOUSEHOLD_COOKIE);
		const active = households.find((h) => h.id === wanted) ?? households[0] ?? null;
		event.locals.activeHousehold = active ? { id: active.id, name: active.name, role: active.role } : null;
	}

	return resolve(event);
};
