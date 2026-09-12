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

/**
 * 保証終了日を確定する。warrantyMonths が指定されていれば購入日からの自動計算を優先し、
 * そうでなければ手動入力の warrantyEndAtOverride をそのまま採用する。
 * (手動上書き時は warrantyMonths を null に戻すのが呼び出し側の責務。)
 */
export function resolveWarrantyEndAt(
	purchasedAt: number,
	warrantyMonths: number | null,
	warrantyEndAtOverride: number | null
): number {
	if (warrantyMonths !== null) return computeWarrantyEndAt(purchasedAt, warrantyMonths);
	if (warrantyEndAtOverride !== null) return warrantyEndAtOverride;
	throw new Error('warrantyMonths か warrantyEndAtOverride のどちらかが必要です。');
}

export interface EntryLike {
	warrantyEndAt: number;
}

/** 保証終了日が近い順(昇順)に並べ替える。 */
export function sortByWarrantyEndAt<T extends EntryLike>(entries: T[]): T[] {
	return [...entries].sort((a, b) => a.warrantyEndAt - b.warrantyEndAt);
}
