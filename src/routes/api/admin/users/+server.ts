import { json } from '@sveltejs/kit';
import { listUsers } from '$lib/server/auth';
import { requireInstanceAdmin } from '$lib/server/apiGuard';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ locals }) => {
	const user = requireInstanceAdmin(locals);
	return json(listUsers().filter((candidate) => candidate.id !== user.id));
};
