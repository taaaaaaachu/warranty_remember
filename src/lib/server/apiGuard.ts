import { error } from '@sveltejs/kit';
import type { HouseholdRole } from '$lib/rbac';

interface AuthedUser {
	id: string;
	username: string;
	instanceRole: import('$lib/rbac').InstanceRole;
	mustChangePassword: boolean;
}

/** ログイン必須。未ログインなら 401。 */
export function requireUser(locals: App.Locals): AuthedUser {
	if (!locals.user) throw error(401, 'ログインが必要です。');
	return locals.user;
}

export interface ActiveContext {
	user: AuthedUser;
	householdId: string;
	role: HouseholdRole;
}

/**
 * ログイン + 有効な世帯を必須にする。世帯未選択なら 400。
 * 保証登録系 API はすべてこれを通す。
 */
export function requireHousehold(locals: App.Locals): ActiveContext {
	const user = requireUser(locals);
	if (!locals.activeHousehold) throw error(400, '世帯が選択されていません。');
	return { user, householdId: locals.activeHousehold.id, role: locals.activeHousehold.role };
}

/** インスタンス管理者(super_admin)必須。 */
export function requireInstanceAdmin(locals: App.Locals): AuthedUser {
	const user = requireUser(locals);
	if (user.instanceRole !== 'super_admin') throw error(403, '権限がありません。');
	return user;
}
