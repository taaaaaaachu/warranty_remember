import { error } from '@sveltejs/kit';
import type { HouseholdRole } from '$lib/rbac';
import { isRecentlyVerified } from './auth';

interface AuthedUser {
	id: string;
	username: string;
	instanceRole: import('$lib/rbac').InstanceRole;
	mustChangePassword: boolean;
}

/** ログイン必須。未ログインなら 401。 */
export function requireUser(locals: Pick<App.Locals, 'user'>): AuthedUser {
	if (!locals.user) throw error(401, 'ログインが必要です。');
	return locals.user;
}

/** 認証情報の変更で直近の本人確認を求める HTTP ステータス(428 Precondition Required)。 */
export const REAUTH_REQUIRED = 428;

/**
 * ログイン必須かつ直近に本人確認(ログイン・再認証)済み。満たさなければ 428。
 * 戻り値の sessionId は「操作端末以外のセッションを無効化」に使う。
 */
export function requireRecentAuth(locals: Pick<App.Locals, 'user' | 'session'>): AuthedUser & { sessionId: string } {
	const user = requireUser(locals);
	if (!locals.session || !isRecentlyVerified(locals.session.verifiedAt)) {
		throw error(REAUTH_REQUIRED, '本人確認が必要です。');
	}
	return { ...user, sessionId: locals.session.id };
}

/** 仮パスワードのユーザーでも使える API。パスワード変更・パスキー登録と、その前の本人確認だけ(docs/adr/0003)。 */
const TEMPORARY_PASSWORD_APIS = new Set([
	'/api/account/password',
	'/api/account/reauth',
	'/api/passkey/auth/options',
	'/api/passkey/register/options',
	'/api/passkey/register/verify'
]);

/** 仮パスワードのユーザーがこのパスを開けるか。変更画面(/account)とログアウトは通す。 */
export function allowedWithTemporaryPassword(pathname: string): boolean {
	return (
		TEMPORARY_PASSWORD_APIS.has(pathname) ||
		pathname === '/account' ||
		pathname === '/logout' ||
		pathname.startsWith('/_app/')
	);
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
