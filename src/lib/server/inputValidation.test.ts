import { describe, it, expect } from 'vitest';
import { validateWarrantyEntryInput, isWarrantyEntryInputError } from './inputValidation';

const baseBody = {
	name: 'ワイヤレスイヤホン',
	purchasedAt: '2024-01-01',
	warrantyEndAt: '2025-01-01'
};

describe('validateWarrantyEntryInput', () => {
	it('必須項目のみで通る', () => {
		const result = validateWarrantyEntryInput(baseBody);
		expect(isWarrantyEntryInputError(result)).toBe(false);
		if (!isWarrantyEntryInputError(result)) {
			expect(result.name).toBe('ワイヤレスイヤホン');
			expect(result.category).toBeNull();
			expect(result.warrantyMonths).toBeNull();
		}
	});

	it('name が空ならエラー', () => {
		const result = validateWarrantyEntryInput({ ...baseBody, name: '  ' });
		expect(isWarrantyEntryInputError(result)).toBe(true);
		if (isWarrantyEntryInputError(result)) expect(result.field).toBe('name');
	});

	it('purchasedAt が不正ならエラー', () => {
		const result = validateWarrantyEntryInput({ ...baseBody, purchasedAt: 'invalid-date' });
		expect(isWarrantyEntryInputError(result)).toBe(true);
		if (isWarrantyEntryInputError(result)) expect(result.field).toBe('purchasedAt');
	});

	it('warrantyMonths が0以下ならエラー', () => {
		const result = validateWarrantyEntryInput({ ...baseBody, warrantyMonths: 0 });
		expect(isWarrantyEntryInputError(result)).toBe(true);
		if (isWarrantyEntryInputError(result)) expect(result.field).toBe('warrantyMonths');
	});

	it('price が負数ならエラー', () => {
		const result = validateWarrantyEntryInput({ ...baseBody, price: -1 });
		expect(isWarrantyEntryInputError(result)).toBe(true);
		if (isWarrantyEntryInputError(result)) expect(result.field).toBe('price');
	});

	it('任意項目を含めて正しく解釈する', () => {
		const result = validateWarrantyEntryInput({
			...baseBody,
			category: '家電',
			manufacturer: 'Acme',
			warrantyMonths: '12',
			price: '9800'
		});
		expect(isWarrantyEntryInputError(result)).toBe(false);
		if (!isWarrantyEntryInputError(result)) {
			expect(result.category).toBe('家電');
			expect(result.manufacturer).toBe('Acme');
			expect(result.warrantyMonths).toBe(12);
			expect(result.price).toBe(9800);
		}
	});
});
