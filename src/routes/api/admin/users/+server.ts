import { listUsers } from '#lib/server/auth.js';
import { requireInstanceAdmin } from '#lib/server/apiGuard.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ locals }) => {
	const user = requireInstanceAdmin(locals);
	return Response.json(listUsers().filter((candidate) => candidate.id !== user.id));
};
