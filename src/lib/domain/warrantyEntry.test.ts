import { describe, it, expect } from 'vitest';
import { computeWarrantyEndAt, daysUntil, sortByWarrantyEndAt, resolveWarrantyEndAt } from './warrantyEntry';

describe('computeWarrantyEndAt', () => {
	it('購入日に保証月数を足した日付を返す', () => {
		const purchasedAt = Date.UTC(2024, 0, 1); // 2024-01-01
		expect(computeWarrantyEndAt(purchasedAt, 12)).toBe(Date.UTC(2025, 0, 1));
	});

	it('月末をまたぐ場合も正しく計算する', () => {
		const purchasedAt = Date.UTC(2024, 0, 31); // 2024-01-31
		// 1ヶ月後は2月末(2024年はうるう年で29日)へ丸められる(Dateの仕様どおり)。
		expect(computeWarrantyEndAt(purchasedAt, 1)).toBe(Date.UTC(2024, 2, 2));
	});

	it('0ヶ月なら購入日と同じ', () => {
		const purchasedAt = Date.UTC(2024, 5, 15);
		expect(computeWarrantyEndAt(purchasedAt, 0)).toBe(purchasedAt);
	});
});

describe('daysUntil', () => {
	it('未来の日付は正の日数を返す', () => {
		const now = Date.UTC(2024, 0, 1);
		const end = now + 5 * 24 * 60 * 60 * 1000;
		expect(daysUntil(now, end)).toBe(5);
	});

	it('過去の日付は負の日数を返す', () => {
		const now = Date.UTC(2024, 0, 10);
		const end = Date.UTC(2024, 0, 1);
		expect(daysUntil(now, end)).toBe(-9);
	});
});

describe('resolveWarrantyEndAt', () => {
	it('warrantyMonths があれば自動計算を優先する', () => {
		const purchasedAt = Date.UTC(2024, 0, 1);
		expect(resolveWarrantyEndAt(purchasedAt, 12, Date.UTC(2099, 0, 1))).toBe(Date.UTC(2025, 0, 1));
	});

	it('warrantyMonths が null なら手動値をそのまま採用する', () => {
		const purchasedAt = Date.UTC(2024, 0, 1);
		const manual = Date.UTC(2026, 0, 1);
		expect(resolveWarrantyEndAt(purchasedAt, null, manual)).toBe(manual);
	});

	it('両方nullなら例外', () => {
		expect(() => resolveWarrantyEndAt(Date.UTC(2024, 0, 1), null, null)).toThrow();
	});
});

describe('sortByWarrantyEndAt', () => {
	it('保証終了日が近い順(昇順)に並べ替える', () => {
		const entries = [{ warrantyEndAt: 300 }, { warrantyEndAt: 100 }, { warrantyEndAt: 200 }];
		expect(sortByWarrantyEndAt(entries).map((e) => e.warrantyEndAt)).toEqual([100, 200, 300]);
	});

	it('元の配列を変更しない', () => {
		const entries = [{ warrantyEndAt: 2 }, { warrantyEndAt: 1 }];
		sortByWarrantyEndAt(entries);
		expect(entries.map((e) => e.warrantyEndAt)).toEqual([2, 1]);
	});
});
