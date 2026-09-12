// クライアント・サーバー両方から使う純粋な権限判定。副作用・DB依存なし。

/** インスタンス全体のロール。運営者は super_admin、通常会員は user。 */
export type InstanceRole = 'super_admin' | 'user';

/** ある世帯におけるロール。ownerは世帯ごとに1人だけ存在する。 */
export type HouseholdRole = 'owner' | 'manager' | 'member';

/** インスタンス管理者(サーバー全体の運営者)か。 */
export function isInstanceAdmin(role: InstanceRole): boolean {
	return role === 'super_admin';
}

/** 招待コードを管理できるか。 */
export function canManageInvites(householdRole: HouseholdRole | null): boolean {
	return householdRole === 'owner' || householdRole === 'manager';
}

/** managerの任命・解任、メンバー除名、世帯設定変更を行えるか。 */
export function canManageMembers(householdRole: HouseholdRole | null): boolean {
	return householdRole === 'owner';
}

/** ownerの交代を開始できるか。 */
export function canTransferOwnership(householdRole: HouseholdRole | null): boolean {
	return householdRole === 'owner';
}

/** 世帯の保証登録(閲覧・編集・アーカイブ・添付画像)を操作できるか。 */
export function canEditEntries(householdRole: HouseholdRole | null): boolean {
	return householdRole !== null;
}
