// See https://svelte.dev/docs/kit/types#app.d.ts
import type { InstanceRole, HouseholdRole } from '$lib/rbac';

declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			user: {
				id: string;
				username: string;
				instanceRole: InstanceRole;
				mustChangePassword: boolean;
			} | null;
			/** 現在のセッション(id は Cookie トークンのハッシュ)。未ログインなら null。 */
			session: { id: string; verifiedAt: number | null } | null;
			/** ログイン中ユーザーが所属する世帯の一覧。 */
			households: { id: string; name: string; role: HouseholdRole }[];
			/** 現在選択中の世帯。未ログインや世帯無しなら null。 */
			activeHousehold: { id: string; name: string; role: HouseholdRole } | null;
		}
		// interface PageData {}
		interface PageState {
			/** 直前に作成した保証登録のid。一覧画面でカードを点滅させて示すために使う。 */
			highlightedEntryId?: string;
		}
		// interface Platform {}
	}
}

export {};
