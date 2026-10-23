import { describe, it, expect, beforeEach } from 'vitest';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { eq } from 'drizzle-orm';
import { createDb, type Db } from './db';
import { users, sessions, passkeys, resetLinks } from './db/schema';
import { listUsers, resetPassword } from './auth';
import { issueResetLink, revokeResetLink, findResetLink, consumeResetLink, RESET_LINK_TTL_MS } from './resetLinks';

let db: Db;

function addUser(username: string): string {
	const id = `id-${username}`;
	db.insert(users).values({ id, username, passwordHash: 'old', createdAt: 0 }).run();
	db.insert(sessions).values({ id: `s-${username}`, userId: id, expiresAt: 9e15 }).run();
	db.insert(passkeys)
		.values({ id: `pk-${username}`, userId: id, publicKey: Buffer.from([1]), counter: 0, name: 'p', createdAt: 0 })
		.run();
	return id;
}
const newPasskey = { id: 'pk-new', publicKey: Buffer.from([2]), counter: 0, transports: null, name: 'n', createdAt: 0 };
function issue(target: string, now = 0): string {
	const r = issueResetLink(db, 'id-admin', target, now);
	if (!r) throw new Error('not found');
	return r.token;
}

beforeEach(() => {
	db = createDb(':memory:');
	migrate(db, { migrationsFolder: './drizzle' });
	addUser('admin');
});

describe('issueResetLink', () => {
	it('発行しただけでは認証情報は変わらない', () => {
		const u = addUser('u');
		expect(issueResetLink(db, 'id-admin', u, 1000)).toMatchObject({ expiresAt: 1000 + RESET_LINK_TTL_MS });
		expect(db.select().from(users).where(eq(users.id, u)).get()?.passwordHash).toBe('old');
		expect(db.select().from(sessions).where(eq(sessions.userId, u)).all()).toHaveLength(1);
		expect(db.select().from(passkeys).where(eq(passkeys.userId, u)).all()).toHaveLength(1);
	});

	it('再発行すると古いリンクは使えなくなる', () => {
		const u = addUser('u');
		const old = issue(u);
		const fresh = issue(u);
		expect(findResetLink(db, old, 0)).toBeNull();
		expect(findResetLink(db, fresh, 0)).toEqual({ userId: u, username: 'u' });
	});

	it('存在しないユーザーには発行できない', () => {
		expect(issueResetLink(db, 'id-admin', 'nobody')).toBeNull();
	});
});

describe('findResetLink', () => {
	it('期限切れ・不明なトークンは null', () => {
		const token = issue(addUser('u'), 0);
		expect(findResetLink(db, token, RESET_LINK_TTL_MS - 1)).not.toBeNull();
		expect(findResetLink(db, token, RESET_LINK_TTL_MS)).toBeNull();
		expect(findResetLink(db, 'x', 0)).toBeNull();
	});

	it('取り消し・仮パスワードの発行で使えなくなる', () => {
		const u = addUser('u');
		const t1 = issue(u);
		revokeResetLink(db, u);
		expect(findResetLink(db, t1, 0)).toBeNull();

		const t2 = issue(u);
		resetPassword(u, 'temp', db);
		expect(findResetLink(db, t2, 0)).toBeNull();
	});

	it('発行者が削除されても有効、対象者が削除されたら消える', () => {
		const ad = addUser('ad');
		const u = addUser('u');
		const r = issueResetLink(db, ad, u, 0);
		db.delete(users).where(eq(users.id, ad)).run();
		expect(findResetLink(db, r!.token, 0)).toEqual({ userId: u, username: 'u' });

		db.delete(users).where(eq(users.id, u)).run();
		expect(db.select().from(resetLinks).all()).toHaveLength(0);
	});
});

describe('consumeResetLink', () => {
	it('パスワードで使うと全初期化し、仮パスワードでない通常のパスワードを設定してリンクを消費する', () => {
		const u = addUser('u');
		db.update(users).set({ mustChangePassword: true }).where(eq(users.id, u)).run();
		const token = issue(u);
		expect(consumeResetLink(db, token, { passwordHash: 'mine' }, 0)).toBe(u);

		const row = db.select().from(users).where(eq(users.id, u)).get();
		expect(row?.passwordHash).toBe('mine');
		expect(row?.mustChangePassword).toBe(false);
		expect(db.select().from(passkeys).where(eq(passkeys.userId, u)).all()).toHaveLength(0);
		expect(db.select().from(sessions).where(eq(sessions.userId, u)).all()).toHaveLength(0);
		expect(consumeResetLink(db, token, { passwordHash: 'again' }, 0)).toBeNull();
	});

	it('パスキーで使うとパスワードを消し、そのパスキーだけを持つ', () => {
		const u = addUser('u');
		expect(consumeResetLink(db, issue(u), { passkey: newPasskey }, 0)).toBe(u);
		expect(db.select().from(users).where(eq(users.id, u)).get()?.passwordHash).toBeNull();
		expect(db.select().from(passkeys).where(eq(passkeys.userId, u)).all().map((p) => p.id)).toEqual(['pk-new']);
	});

	it('登録済みのパスキーで失敗したら何も変えず、リンクも残す', () => {
		const u = addUser('u');
		const token = issue(u);
		expect(() => consumeResetLink(db, token, { passkey: { ...newPasskey, id: 'pk-admin' } }, 0)).toThrow();
		expect(db.select().from(users).where(eq(users.id, u)).get()?.passwordHash).toBe('old');
		expect(findResetLink(db, token, 0)).not.toBeNull();
	});

	it('他のユーザーの認証情報には触れない', () => {
		consumeResetLink(db, issue(addUser('u')), { passwordHash: 'mine' }, 0);
		expect(db.select().from(passkeys).where(eq(passkeys.userId, 'id-admin')).all()).toHaveLength(1);
		expect(db.select().from(sessions).where(eq(sessions.userId, 'id-admin')).all()).toHaveLength(1);
	});
});

describe('listUsers のリンク表示', () => {
	it('期限内の未使用リンクだけ期限を返す', () => {
		const u = addUser('u');
		issue(u, 0);
		const linkOf = (now: number) => listUsers(db, now).find((x) => x.id === u)?.resetLinkExpiresAt;
		expect(linkOf(0)).toBe(RESET_LINK_TTL_MS);
		expect(linkOf(RESET_LINK_TTL_MS)).toBeNull();
		expect(listUsers(db, 0).find((x) => x.id === 'id-admin')?.resetLinkExpiresAt).toBeNull();
	});
});
