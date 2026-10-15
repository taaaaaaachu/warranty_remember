import { afterEach, describe, expect, it, vi } from 'vitest';
import { api, ApiError, isPasskeyCancel, REAUTH_REQUIRED } from './passkeyClient';

afterEach(() => vi.unstubAllGlobals());

describe('api', () => {
	it('成功なら JSON を返し、失敗ならサーバーのメッセージとステータスで ApiError を投げる', async () => {
		vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(new Response('{"ok":true}', { status: 200 })));
		expect(await api('/x')).toEqual({ ok: true });

		vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(new Response('{"message":"本人確認が必要です。"}', { status: 428 })));
		const err = await api('/x').catch((e: unknown) => e);
		expect(err).toBeInstanceOf(ApiError);
		expect(err).toMatchObject({ message: '本人確認が必要です。', status: REAUTH_REQUIRED });
	});
});

describe('isPasskeyCancel', () => {
	it('ユーザーの取り消し(NotAllowedError / AbortError)だけ true', () => {
		const named = (name: string) => Object.assign(new Error('x'), { name });
		expect(isPasskeyCancel(named('NotAllowedError'))).toBe(true);
		expect(isPasskeyCancel(named('AbortError'))).toBe(true);
		expect(isPasskeyCancel(new ApiError('x', 400))).toBe(false);
	});
});
