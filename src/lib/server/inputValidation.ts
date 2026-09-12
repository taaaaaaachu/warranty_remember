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
	warrantyMonths: number | null;
	warrantyEndAt: number;
	contactNote: string | null;
	memo: string | null;
}

export type WarrantyEntryInputError = { field: string; message: string };

/**
 * 保証登録フォーム入力を検証する。
 * warrantyEndAt は「購入日+保証月数」からの自動計算値、または手動入力値のどちらかを
 * 呼び出し側で解決してから渡す(このバリデータは最終的な数値だけを見る)。
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

	const warrantyEndAt = parseDateMs(body.warrantyEndAt);
	if (warrantyEndAt === null) return { field: 'warrantyEndAt', message: '保証終了日が不正です。' };

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
		warrantyEndAt,
		contactNote: parseOptionalString(body.contactNote),
		memo: parseOptionalString(body.memo)
	};
}

export function isWarrantyEntryInputError(
	value: WarrantyEntryInput | WarrantyEntryInputError
): value is WarrantyEntryInputError {
	return 'field' in value;
}
