import { describe, it, expect, beforeEach } from 'vitest';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { createDb, type Db } from './db';
import { createHousehold } from './households';
import {
	createWarrantyEntry,
	getWarrantyEntry,
	listWarrantyEntries,
	updateWarrantyEntry,
	archiveWarrantyEntry,
	unarchiveWarrantyEntry,
	deleteWarrantyEntry,
	addAttachment,
	listAttachments,
	getAttachmentForHousehold,
	deleteAttachment
} from './warranty';
import type { WarrantyEntryInput } from './inputValidation';

let db: Db;
let householdId: string;
let otherHouseholdId: string;

const baseInput: WarrantyEntryInput = {
	name: 'ワイヤレスイヤホン',
	category: '家電',
	manufacturer: 'Acme',
	modelNumber: 'AC-100',
	serialNumber: 'SN-1',
	purchasedAt: Date.UTC(2024, 0, 1),
	purchasedFrom: 'Amazon',
	price: 9800,
	warrantyMonths: 12,
	warrantyEndAt: Date.UTC(2025, 0, 1),
	contactNote: null,
	memo: null
};

beforeEach(() => {
	db = createDb(':memory:');
	migrate(db, { migrationsFolder: './drizzle' });
	householdId = createHousehold(db, '自宅').id;
	otherHouseholdId = createHousehold(db, '実家').id;
});

describe('作成・取得', () => {
	it('作成した保証登録を同じ世帯から取得できる', () => {
		const entry = createWarrantyEntry(db, householdId, baseInput);
		expect(getWarrantyEntry(db, householdId, entry.id)?.name).toBe('ワイヤレスイヤホン');
	});

	it('他世帯からは取得できない', () => {
		const entry = createWarrantyEntry(db, householdId, baseInput);
		expect(getWarrantyEntry(db, otherHouseholdId, entry.id)).toBeNull();
	});
});

describe('一覧', () => {
	it('通常一覧は保証終了日が近い順で、アーカイブ済みは含まない', () => {
		const soon = createWarrantyEntry(db, householdId, { ...baseInput, warrantyEndAt: Date.UTC(2024, 5, 1) });
		const later = createWarrantyEntry(db, householdId, { ...baseInput, warrantyEndAt: Date.UTC(2026, 0, 1) });
		const archived = createWarrantyEntry(db, householdId, { ...baseInput, warrantyEndAt: Date.UTC(2024, 0, 1) });
		archiveWarrantyEntry(db, householdId, archived.id);

		const list = listWarrantyEntries(db, householdId, { archived: false });
		expect(list.map((e) => e.id)).toEqual([soon.id, later.id]);
	});

	it('カテゴリー・キーワードで絞り込める', () => {
		createWarrantyEntry(db, householdId, { ...baseInput, name: 'ドライヤー', category: '美容家電' });
		createWarrantyEntry(db, householdId, { ...baseInput, name: 'イヤホン', category: '家電' });

		expect(listWarrantyEntries(db, householdId, { archived: false, category: '美容家電' })).toHaveLength(1);
		expect(listWarrantyEntries(db, householdId, { archived: false, query: 'イヤホン' })).toHaveLength(1);
		expect(listWarrantyEntries(db, householdId, { archived: false, query: '存在しない' })).toHaveLength(0);
	});
});

describe('更新・アーカイブ・削除', () => {
	it('更新は所属世帯のものだけ反映される', () => {
		const entry = createWarrantyEntry(db, householdId, baseInput);
		expect(updateWarrantyEntry(db, householdId, entry.id, { ...baseInput, name: '新しい名前' })).toBe(true);
		expect(getWarrantyEntry(db, householdId, entry.id)?.name).toBe('新しい名前');
		expect(updateWarrantyEntry(db, otherHouseholdId, entry.id, { ...baseInput, name: '乗っ取り' })).toBe(false);
	});

	it('アーカイブと復元を往復できる', () => {
		const entry = createWarrantyEntry(db, householdId, baseInput);
		expect(archiveWarrantyEntry(db, householdId, entry.id)).toBe(true);
		expect(listWarrantyEntries(db, householdId, { archived: false })).toHaveLength(0);
		expect(listWarrantyEntries(db, householdId, { archived: true })).toHaveLength(1);
		expect(unarchiveWarrantyEntry(db, householdId, entry.id)).toBe(true);
		expect(listWarrantyEntries(db, householdId, { archived: false })).toHaveLength(1);
	});

	it('削除すると添付画像のメタデータも消え、削除前のファイル一覧が返る', () => {
		const entry = createWarrantyEntry(db, householdId, baseInput);
		addAttachment(db, entry.id, 'a/b.jpg', 'image/jpeg');
		const removedFiles = deleteWarrantyEntry(db, householdId, entry.id);
		expect(removedFiles).toHaveLength(1);
		expect(getWarrantyEntry(db, householdId, entry.id)).toBeNull();
		expect(listAttachments(db, entry.id)).toHaveLength(0);
	});

	it('他世帯の保証登録は削除できない(添付一覧も空で返る)', () => {
		const entry = createWarrantyEntry(db, householdId, baseInput);
		expect(deleteWarrantyEntry(db, otherHouseholdId, entry.id)).toEqual([]);
		expect(getWarrantyEntry(db, householdId, entry.id)).not.toBeNull();
	});
});

describe('添付画像', () => {
	it('追加順にposition連番が振られ、世帯所有権を確認して取得できる', () => {
		const entry = createWarrantyEntry(db, householdId, baseInput);
		const first = addAttachment(db, entry.id, 'a.jpg', 'image/jpeg');
		const second = addAttachment(db, entry.id, 'b.jpg', 'image/jpeg');
		expect(first.position).toBe(0);
		expect(second.position).toBe(1);
		expect(listAttachments(db, entry.id).map((a) => a.id)).toEqual([first.id, second.id]);
		expect(getAttachmentForHousehold(db, householdId, first.id)?.filePath).toBe('a.jpg');
		expect(getAttachmentForHousehold(db, otherHouseholdId, first.id)).toBeNull();
	});

	it('entryIdが一致しない削除は失敗する', () => {
		const entry = createWarrantyEntry(db, householdId, baseInput);
		const other = createWarrantyEntry(db, householdId, baseInput);
		const attachment = addAttachment(db, entry.id, 'a.jpg', 'image/jpeg');
		expect(deleteAttachment(db, other.id, attachment.id)).toBeNull();
		expect(deleteAttachment(db, entry.id, attachment.id)?.id).toBe(attachment.id);
	});
});
