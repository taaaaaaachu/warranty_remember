/** ログイン後の戻り先。自サイト内のパス(`/` で始まり `//` `/\` でない)だけ許し、それ以外は `/`。 */
export function safeNext(value: string | null | undefined): string {
	return value && /^\/(?![/\\])/.test(value) ? value : '/';
}
