import { describe, it, expect } from 'vitest';
import { isInstanceAdmin, canManageInvites, canManageMembers, canEditEntries } from './rbac';

describe('isInstanceAdmin', () => {
	it('super_admin のみ true', () => {
		expect(isInstanceAdmin('super_admin')).toBe(true);
		expect(isInstanceAdmin('user')).toBe(false);
	});
});

describe('household capabilities', () => {
	it('世帯 owner は管理できる', () => {
		expect(canManageInvites('owner')).toBe(true);
		expect(canManageMembers('owner')).toBe(true);
	});
	it('managerは招待だけ管理できる', () => {
		expect(canManageInvites('manager')).toBe(true);
		expect(canManageMembers('manager')).toBe(false);
	});
	it('memberと非所属は招待・メンバー管理できない', () => {
		expect(canManageInvites('member')).toBe(false);
		expect(canManageInvites(null)).toBe(false);
		expect(canManageMembers('member')).toBe(false);
	});
});

describe('canEditEntries', () => {
	it('owner/member は保証登録を編集できる', () => {
		expect(canEditEntries('owner')).toBe(true);
		expect(canEditEntries('member')).toBe(true);
	});
	it('非所属は編集できない', () => {
		expect(canEditEntries(null)).toBe(false);
	});
});
