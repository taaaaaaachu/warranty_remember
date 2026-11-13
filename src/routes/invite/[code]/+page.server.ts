import { error, fail, redirect } from '@sveltejs/kit';
import { db } from '#lib/server/db/index.js';
import { joinHouseholdByInvite, previewInvite, REGISTER_ERROR_MESSAGES } from '#lib/server/households.js';
import { setHouseholdCookie } from '#lib/server/sessionCookie.js';
import type { Actions, PageServerLoad } from './$types';

// 開いただけでは参加しない(リンクのプレビュー取得でコードを消費しないため)。参加は POST のみ。
// コードは 72 ビットの乱数なので、照会に試行回数制限は設けない。
export const load: PageServerLoad = ({ params, locals }) => {
	const invite = previewInvite(db, params.code, locals.user?.id ?? null);
	if (!invite) throw error(404, '招待コードが正しくありません。');
	return { invite, code: params.code, loggedIn: locals.user !== null };
};

export const actions: Actions = {
	default: ({ params, locals, cookies }) => {
		if (!locals.user) throw redirect(303, `/login?next=${encodeURIComponent(`/invite/${params.code}`)}`);
		const invite = previewInvite(db, params.code, locals.user.id);
		if (!invite) throw error(404, '招待コードが正しくありません。');
		// 参加済みの世帯なら、その世帯へ切り替えるだけ(コードは消費しない)。
		// 自分が使って使用済みになったコードでも開けるよう、コードの状態より先に判定する。
		if (!invite.alreadyMember) {
			const result = joinHouseholdByInvite(db, locals.user.id, params.code);
			if (!result.ok && result.error !== 'already_member')
				return fail(400, { error: REGISTER_ERROR_MESSAGES[result.error] });
		}
		setHouseholdCookie(cookies, invite.householdId);
		throw redirect(303, '/');
	}
};
