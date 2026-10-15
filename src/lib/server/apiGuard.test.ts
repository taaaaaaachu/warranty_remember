import { describe, expect, it } from 'vitest';
import { requireRecentAuth } from './apiGuard';

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
