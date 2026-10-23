import { error } from '@sveltejs/kit';
import { db } from '#lib/server/db/index.js';
import { revokeInvite } from '#lib/server/households.js';
import { requireInstanceAdmin } from '#lib/server/apiGuard.js';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = ({ locals, params }) => {
	requireInstanceAdmin(locals);
	if (!revokeInvite(db, params.id, params.inviteId)) throw error(400, 'この招待は無効化できません。');
	return Response.json({ ok: true });
};
