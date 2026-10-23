import { error } from '@sveltejs/kit';
import { db } from '#lib/server/db/index.js';
import { createInvite, listHouseholdInvites } from '#lib/server/households.js';
import { requireInstanceAdmin } from '#lib/server/apiGuard.js';
import { parsePositiveInteger } from '#lib/server/inputValidation.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ locals, params }) => {
	requireInstanceAdmin(locals);
	return Response.json(listHouseholdInvites(db, params.id));
};

export const POST: RequestHandler = async ({ locals, params, request }) => {
	const user = requireInstanceAdmin(locals);
	const body = await request.json().catch(() => null);
	let expiresAt: number | null = null;
	if (body?.expiresInDays !== undefined && body?.expiresInDays !== null) {
		const days = parsePositiveInteger(body.expiresInDays);
		if (days === null) throw error(400, '有効期限が不正です。');
		expiresAt = Date.now() + days * 24 * 60 * 60 * 1000;
	}
	const invite = createInvite(db, params.id, user.id, expiresAt);
	return Response.json({ id: invite.id, code: invite.code }, { status: 201 });
};
