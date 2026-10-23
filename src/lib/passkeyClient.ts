import { startAuthentication, startRegistration } from '@simplewebauthn/browser';

/** API の失敗。status で「本人確認が必要(428)」などを判別できる。 */
export class ApiError extends Error {
	constructor(
		message: string,
		readonly status: number
	) {
		super(message);
	}
}

/** 認証情報の変更に直近の本人確認が要るときのステータス(サーバーの REAUTH_REQUIRED)。 */
export const REAUTH_REQUIRED = 428;

/** JSON API を呼ぶ。失敗時はサーバーのメッセージで ApiError を投げる。 */
export async function api<T = unknown>(input: string, init?: RequestInit): Promise<T> {
	const res = await fetch(input, { ...init, headers: { 'content-type': 'application/json', ...init?.headers } });
	const body = await res.json().catch(() => null);
	if (!res.ok) throw new ApiError(body?.message ?? `エラーが発生しました(${res.status})。`, res.status);
	return body as T;
}

/** パスキーで認証し、その応答を返す(ログインと本人確認で共用)。 */
async function passkeyAssertion(useBrowserAutofill = false) {
	const optionsJSON = await api<Parameters<typeof startAuthentication>[0]['optionsJSON']>('/api/passkey/auth/options', {
		method: 'POST'
	});
	return startAuthentication({ optionsJSON, useBrowserAutofill });
}

/** パスキーでログインする。useBrowserAutofill ならユーザー名欄のオートフィルから選ばせる。 */
export async function loginWithPasskey(useBrowserAutofill = false): Promise<void> {
	const response = await passkeyAssertion(useBrowserAutofill);
	await api('/api/passkey/login', { method: 'POST', body: JSON.stringify({ response }) });
}

/**
 * パスキーを作って登録する。start が signup(未ログインでの会員登録)か resetToken(リセットリンクでの再設定)なら
 * それを、省けばログイン中のユーザーへの追加になる。
 */
async function registerPasskey(
	name: string,
	start: { username: string; invite: string; household: string } | { resetToken: string } | object = {}
) {
	const optionsJSON = await api<Parameters<typeof startRegistration>[0]['optionsJSON']>('/api/passkey/register/options', {
		method: 'POST',
		body: JSON.stringify(start)
	});
	const response = await startRegistration({ optionsJSON });
	await api('/api/passkey/register/verify', { method: 'POST', body: JSON.stringify({ response, name }) });
}

export function signupWithPasskey(signup: { username: string; invite: string; household: string }): Promise<void> {
	return registerPasskey('', signup);
}

export function addPasskey(name: string): Promise<void> {
	return registerPasskey(name);
}

/** リセットリンクでパスキーを登録し、そのままログインする。 */
export function resetWithPasskey(resetToken: string, name: string): Promise<void> {
	return registerPasskey(name, { resetToken });
}

export function renamePasskey(id: string, name: string): Promise<unknown> {
	return api(`/api/account/passkeys/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify({ name }) });
}

export function deletePasskey(id: string): Promise<unknown> {
	return api(`/api/account/passkeys/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export function removeOwnPassword(): Promise<unknown> {
	return api('/api/account/password', { method: 'DELETE' });
}

/** 本人確認(再認証)。パスワードを渡せばパスワードで、省けばパスキーで行う。 */
export async function reauthenticate(password?: string): Promise<void> {
	const body = password !== undefined ? { password } : { response: await passkeyAssertion() };
	await api('/api/account/reauth', { method: 'POST', body: JSON.stringify(body) });
}

/** ブラウザ操作(パスキー作成・選択)をユーザーが取り消したか。 */
export function isPasskeyCancel(err: unknown): boolean {
	return err instanceof Error && (err.name === 'NotAllowedError' || err.name === 'AbortError');
}
