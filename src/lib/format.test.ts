import { describe, it, expect } from 'vitest';
import { formatDate, localDateInput, dateInputToTimestamp, formatDaysUntil } from './format';

describe('formatDate', () => {
	it('YYYY/MM/DD 形式にする', () => {
		expect(formatDate(new Date(2024, 0, 5).getTime())).toBe('2024/01/05');
	});
	it('nullは—', () => {
		expect(formatDate(null)).toBe('—');
	});
});

describe('localDateInput / dateInputToTimestamp', () => {
	it('往復できる', () => {
		const d = new Date(2024, 5, 15);
		const str = localDateInput(d);
		expect(str).toBe('2024-06-15');
		expect(new Date(dateInputToTimestamp(str)!).getDate()).toBe(15);
	});
	it('不正な文字列はnull', () => {
		expect(dateInputToTimestamp('not-a-date')).toBeNull();
	});
});

describe('formatDaysUntil', () => {
	it('正の日数はあと○日', () => {
		expect(formatDaysUntil(3)).toBe('あと3日');
	});
	it('0は本日', () => {
		expect(formatDaysUntil(0)).toBe('本日');
	});
	it('負の日数は超過', () => {
		expect(formatDaysUntil(-2)).toBe('2日超過');
	});
});
