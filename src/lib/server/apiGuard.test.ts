import { describe, expect, it } from 'vitest';
import { allowedWithTemporaryPassword, requireRecentAuth } from './apiGuard';

describe('requireRecentAuth', () => {
	const user = { id: 'u', username: 'u', instanceRole: 'user' as const, mustChangePassword: false };

	it('直近に本人確認していれば、ユーザーとセッション id を返す', () => {
		const locals = { user, session: { id: 's', verifiedAt: Date.now() } };
		expect(requireRecentAuth(locals)).toEqual({ ...user, sessionId: 's' });
	});

	it('本人確認が古い・未確認なら 428、未ログインなら 401', () => {
		const stale = { user, session: { id: 's', verifiedAt: Date.now() - 60 * 60 * 1000 } };
		expect(() => requireRecentAuth(stale)).toThrow(expect.objectContaining({ status: 428 }));
		expect(() => requireRecentAuth({ user, session: { id: 's', verifiedAt: null } })).toThrow(
			expect.objectContaining({ status: 428 })
		);
		expect(() => requireRecentAuth({ user: null, session: null })).toThrow(expect.objectContaining({ status: 401 }));
	});
});

describe('allowedWithTemporaryPassword', () => {
	it('変更画面・ログアウトと、パスワード変更・パスキー登録・本人確認の API だけ許す', () => {
		for (const p of [
			'/account',
			'/logout',
			'/reset/abc',
			'/_app/immutable/x.js',
			'/api/account/password',
			'/api/account/reauth',
			'/api/passkey/auth/options',
			'/api/passkey/register/options',
			'/api/passkey/register/verify'
		]) {
			expect(allowedWithTemporaryPassword(p)).toBe(true);
		}
		for (const p of ['/', '/archive', '/entries/x', '/api/entries', '/api/account/passkeys/x', '/api/account/delete', '/api/admin/users']) {
			expect(allowedWithTemporaryPassword(p)).toBe(false);
		}
	});
});
