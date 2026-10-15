import { describe, it, expect } from 'vitest';
import Database from 'better-sqlite3';
import { cpSync, mkdtempSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { applyMigrations } from '../../../../scripts/migrate.js';

/** 先頭 n 本だけのマイグレーションフォルダを作る(古い版の DB を再現する)。 */
function firstMigrations(n: number): string {
	const dir = mkdtempSync(join(tmpdir(), 'mig-'));
	mkdirSync(join(dir, 'meta'));
	const journal = JSON.parse(readFileSync('./drizzle/meta/_journal.json', 'utf-8'));
	journal.entries = journal.entries.slice(0, n);
	writeFileSync(join(dir, 'meta/_journal.json'), JSON.stringify(journal));
	for (const e of journal.entries) cpSync(`./drizzle/${e.tag}.sql`, join(dir, `${e.tag}.sql`));
	return dir;
}

describe('applyMigrations', () => {
	it('users を作り直す 0001 を適用しても、users を参照するデータが消えない', () => {
		const sqlite = new Database(':memory:');
		applyMigrations(sqlite, firstMigrations(1));
		// users を参照する全テーブル(sessions・memberships・ownership_transfers・invites)に入れる。
		sqlite.exec(`
			insert into users(id, username, password_hash, must_change_password, instance_role, created_at)
				values ('u', 'alice', 'h', 0, 'super_admin', 0), ('v', 'bob', 'h', 1, 'user', 0);
			insert into sessions(id, user_id, expires_at) values ('s', 'u', 9);
			insert into households(id, name, created_at) values ('h', '自宅', 0);
			insert into memberships(id, user_id, household_id, role, created_at)
				values ('m1', 'u', 'h', 'owner', 0), ('m2', 'v', 'h', 'member', 0);
			insert into ownership_transfers(id, household_id, current_owner_id, candidate_user_id, created_at)
				values ('t', 'h', 'u', 'v', 0);
			insert into invites(id, code, household_id, created_by, created_at, used_by, used_at)
				values ('i', 'code', 'h', 'u', 0, 'v', 1);
			insert into warranty_entries(id, household_id, name, purchased_at, warranty_end_at, created_at, updated_at)
				values ('e', 'h', 'PC', 0, 1, 0, 0);
		`);

		applyMigrations(sqlite);

		const count = (t: string) => (sqlite.prepare(`select count(*) c from ${t}`).get() as { c: number }).c;
		expect(count('users')).toBe(2);
		expect(count('sessions')).toBe(1);
		expect(count('memberships')).toBe(2);
		expect(count('ownership_transfers')).toBe(1);
		expect(count('warranty_entries')).toBe(1);
		expect(sqlite.prepare('select created_by, used_by from invites').get()).toEqual({ created_by: 'u', used_by: 'v' });
		expect(sqlite.prepare("select must_change_password m from users where id = 'v'").get()).toEqual({ m: 1 });
		expect(sqlite.pragma('foreign_keys', { simple: true })).toBe(1);
	});
});
