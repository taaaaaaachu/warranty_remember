// 保証登録の日付計算。副作用・DB依存なし。

/** 購入日(epoch ms)に保証期間(月数)を足した保証終了日(epoch ms)を返す。 */
export function computeWarrantyEndAt(purchasedAt: number, warrantyMonths: number): number {
	const d = new Date(purchasedAt);
	d.setUTCMonth(d.getUTCMonth() + warrantyMonths);
	return d.getTime();
}

/** 保証終了日までの残り日数(切り上げ)。過去なら負の値。 */
export function daysUntil(now: number, warrantyEndAt: number): number {
	return Math.ceil((warrantyEndAt - now) / (1000 * 60 * 60 * 24));
}

export interface EntryLike {
	warrantyEndAt: number;
}

/** 保証終了日が近い順(昇順)に並べ替える。 */
export function sortByWarrantyEndAt<T extends EntryLike>(entries: T[]): T[] {
	return [...entries].sort((a, b) => a.warrantyEndAt - b.warrantyEndAt);
}
