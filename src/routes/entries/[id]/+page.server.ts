import { error, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { getWarrantyEntry, listAttachments } from '$lib/server/warranty';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals, params }) => {
	if (!locals.user) throw redirect(303, '/login');
	if (!locals.activeHousehold) throw error(400, '世帯が選択されていません。');
	const entry = getWarrantyEntry(db, locals.activeHousehold.id, params.id);
	if (!entry) throw error(404, '保証登録が見つかりません。');
	return { entry, attachments: listAttachments(db, entry.id) };
};
