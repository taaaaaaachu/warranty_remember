import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { requireInstanceAdmin } from '$lib/server/apiGuard';
import { issueResetLink, revokeResetLink } from '$lib/server/resetLinks';
import type { RequestHandler } from './$types';

/** リセットリンクの発行(docs/adr/0003)。URL は発行時の応答でしか返さない(DB にはハッシュだけ残す)。 */
export const POST: RequestHandler = ({ locals, params, url }) => {
	const admin = requireInstanceAdmin(locals);
	if (params.id === admin.id) throw error(400, '自分のリセットリンクは発行できません。');
	const issued = issueResetLink(db, admin.id, params.id);
	if (!issued) throw error(404, 'ユーザーが見つかりません。');
	return json({ url: `${url.origin}/reset/${issued.token}`, expiresAt: issued.expiresAt });
};

/** 未使用のリセットリンクの取り消し。 */
export const DELETE: RequestHandler = ({ locals, params }) => {
	const admin = requireInstanceAdmin(locals);
	if (params.id === admin.id) throw error(400, '自分のリセットリンクは取り消せません。');
	revokeResetLink(db, params.id);
	return new Response(null, { status: 204 });
};
