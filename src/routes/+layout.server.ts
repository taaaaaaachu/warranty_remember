import type { LayoutServerLoad } from './$types';

/**
 * 認証状態と世帯コンテキストを全ページへ渡す。別端末での世帯の追加・除名・ロール変更を反映するため、
 * invalidate('app:user') で読み直せるようにする(url は参照しない。遷移のたびに読み直すとオフラインで遷移できなくなる)。
 */
export const load: LayoutServerLoad = ({ locals, depends }) => {
	depends('app:user');
	return {
		user: locals.user,
		households: locals.households,
		activeHousehold: locals.activeHousehold
	};
};
