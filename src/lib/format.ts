/** epoch ミリ秒を「YYYY/MM/DD」で表す(ローカルタイム)。null は「—」。 */
export function formatDate(ms: number | null): string {
	if (ms === null || !Number.isFinite(ms)) return '—';
	const d = new Date(ms);
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, '0');
	const day = String(d.getDate()).padStart(2, '0');
	return `${y}/${m}/${day}`;
}

/** epoch ミリ秒を「YYYY/MM/DD HH:MM」で表す(ローカルタイム)。null は「—」。 */
export function formatDateTime(ms: number | null): string {
	if (ms === null || !Number.isFinite(ms)) return '—';
	const d = new Date(ms);
	const hh = String(d.getHours()).padStart(2, '0');
	const mm = String(d.getMinutes()).padStart(2, '0');
	return `${formatDate(ms)} ${hh}:${mm}`;
}

/** `<input type="date">` 用のローカル日付文字列(YYYY-MM-DD)。 */
export function localDateInput(d: Date = new Date()): string {
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, '0');
	const day = String(d.getDate()).padStart(2, '0');
	return `${y}-${m}-${day}`;
}

/** 日付入力(YYYY-MM-DD)をそのローカル日の 0:00 の epoch ミリ秒へ変換する。 */
export function dateInputToTimestamp(dateStr: string): number | null {
	const t = new Date(`${dateStr}T00:00:00`).getTime();
	return Number.isFinite(t) ? t : null;
}

/**
 * 「今から見た日数」を人間語にする。
 * 例: 3 → "あと3日"、0 → "本日"、-2 → "2日超過"。
 */
export function formatDaysUntil(days: number | null): string {
	if (days === null || !Number.isFinite(days)) return '—';
	const d = Math.round(days);
	if (d > 0) return `あと${d}日`;
	if (d === 0) return '本日';
	return `${-d}日超過`;
}
