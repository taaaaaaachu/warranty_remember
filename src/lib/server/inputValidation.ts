export function parseNonEmptyString(value: unknown): string | null {
	if (typeof value !== 'string') return null;
	const trimmed = value.trim();
	return trimmed === '' ? null : trimmed;
}

export function parseOptionalString(value: unknown): string | null {
	if (value === null || value === undefined) return null;
	if (typeof value !== 'string') return null;
	const trimmed = value.trim();
	return trimmed === '' ? null : trimmed;
}

export function parseNonNegativeInteger(value: unknown): number | null {
	if (value === null || value === undefined || (typeof value === 'string' && value.trim() === '')) return null;
	if (typeof value === 'boolean') return null;
	const number = Number(value);
	return Number.isFinite(number) && Number.isInteger(number) && number >= 0 ? number : null;
}

export function parsePositiveInteger(value: unknown): number | null {
	if (typeof value === 'boolean') return null;
	const number = Number(value);
	return Number.isFinite(number) && Number.isInteger(number) && number > 0 ? number : null;
}

/** 日付文字列(YYYY-MM-DD など)や epoch ms を受け取り、epoch ms を返す。 */
export function parseDateMs(value: unknown): number | null {
	if (value === null || value === undefined || (typeof value === 'string' && value.trim() === '')) return null;
	if (typeof value === 'number') return Number.isFinite(value) ? value : null;
	if (typeof value !== 'string') return null;
	const ms = new Date(value).getTime();
	return Number.isFinite(ms) ? ms : null;
}

export interface WarrantyEntryInput {
	name: string;
	category: string | null;
	manufacturer: string | null;
	modelNumber: string | null;
	serialNumber: string | null;
	purchasedAt: number;
	purchasedFrom: string | null;
	price: number | null;
	/** 非null なら保証終了日を自動計算する(手動上書き時は null)。 */
	warrantyMonths: number | null;
	/** warrantyMonths が null のときだけ意味を持つ、手動入力の保証終了日。 */
	warrantyEndAtOverride: number | null;
	contactNote: string | null;
	memo: string | null;
}

export type WarrantyEntryInputError = { field: string; message: string };

/**
 * 保証登録フォーム入力を検証する。
 * 保証終了日そのものの確定(自動計算 or 手動値の採用)は呼び出し側(server/warranty.ts)が
 * warrantyMonths / warrantyEndAtOverride から解決する。
 */
export function validateWarrantyEntryInput(body: Record<string, unknown>): WarrantyEntryInput | WarrantyEntryInputError {
	const name = parseNonEmptyString(body.name);
	if (!name) return { field: 'name', message: 'ガジェット名は必須です。' };

	const purchasedAt = parseDateMs(body.purchasedAt);
	if (purchasedAt === null) return { field: 'purchasedAt', message: '購入日が不正です。' };

	const warrantyMonthsRaw = body.warrantyMonths;
	let warrantyMonths: number | null = null;
	if (warrantyMonthsRaw !== null && warrantyMonthsRaw !== undefined && warrantyMonthsRaw !== '') {
		warrantyMonths = parsePositiveInteger(warrantyMonthsRaw);
		if (warrantyMonths === null) return { field: 'warrantyMonths', message: '保証期間(月数)が不正です。' };
	}

	const warrantyEndAtOverride = parseDateMs(body.warrantyEndAt);
	if (warrantyMonths === null && warrantyEndAtOverride === null)
		return { field: 'warrantyEndAt', message: '保証期間(月数)か保証終了日のどちらかは必須です。' };

	const priceRaw = body.price;
	let price: number | null = null;
	if (priceRaw !== null && priceRaw !== undefined && priceRaw !== '') {
		price = parseNonNegativeInteger(priceRaw);
		if (price === null) return { field: 'price', message: '金額が不正です。' };
	}

	return {
		name,
		category: parseOptionalString(body.category),
		manufacturer: parseOptionalString(body.manufacturer),
		modelNumber: parseOptionalString(body.modelNumber),
		serialNumber: parseOptionalString(body.serialNumber),
		purchasedAt,
		purchasedFrom: parseOptionalString(body.purchasedFrom),
		price,
		warrantyMonths,
		warrantyEndAtOverride,
		contactNote: parseOptionalString(body.contactNote),
		memo: parseOptionalString(body.memo)
	};
}

export function isWarrantyEntryInputError(
	value: WarrantyEntryInput | WarrantyEntryInputError
): value is WarrantyEntryInputError {
	return 'field' in value;
}
