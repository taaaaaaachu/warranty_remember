import { randomBytes } from 'node:crypto';
import { and, eq, isNull, isNotNull, desc, asc, like, or } from 'drizzle-orm';
import type { Db } from './db';
import { warrantyEntries, attachments, type WarrantyEntryRow, type AttachmentRow } from './db/schema';
import type { WarrantyEntryInput } from './inputValidation';
import { resolveWarrantyEndAt } from '$lib/domain/warrantyEntry';

function newId(): string {
	return randomBytes(16).toString('hex');
}

export function createWarrantyEntry(db: Db, householdId: string, input: WarrantyEntryInput): WarrantyEntryRow {
	const now = Date.now();
	const row: WarrantyEntryRow = {
		id: newId(),
		householdId,
		name: input.name,
		category: input.category,
		manufacturer: input.manufacturer,
		modelNumber: input.modelNumber,
		serialNumber: input.serialNumber,
		purchasedAt: input.purchasedAt,
		purchasedFrom: input.purchasedFrom,
		price: input.price,
		warrantyMonths: input.warrantyMonths,
		warrantyEndAt: resolveWarrantyEndAt(input.purchasedAt, input.warrantyMonths, input.warrantyEndAtOverride),
		contactNote: input.contactNote,
		memo: input.memo,
		archivedAt: null,
		createdAt: now,
		updatedAt: now
	};
	db.insert(warrantyEntries).values(row).run();
	return row;
}

export function getWarrantyEntry(db: Db, householdId: string, id: string): WarrantyEntryRow | null {
	return (
		db
			.select()
			.from(warrantyEntries)
			.where(and(eq(warrantyEntries.id, id), eq(warrantyEntries.householdId, householdId)))
			.get() ?? null
	);
}

export interface ListWarrantyEntriesOptions {
	archived: boolean;
	category?: string;
	query?: string;
}

/** 通常一覧は保証終了日が近い順、アーカイブ一覧はアーカイブした順(新しい順)。 */
export function listWarrantyEntries(db: Db, householdId: string, options: ListWarrantyEntriesOptions): WarrantyEntryRow[] {
	const conditions = [
		eq(warrantyEntries.householdId, householdId),
		options.archived ? isNotNull(warrantyEntries.archivedAt) : isNull(warrantyEntries.archivedAt)
	];
	if (options.category) conditions.push(eq(warrantyEntries.category, options.category));
	if (options.query) {
		const q = `%${options.query}%`;
		const keyword = or(
			like(warrantyEntries.name, q),
			like(warrantyEntries.manufacturer, q),
			like(warrantyEntries.modelNumber, q),
			like(warrantyEntries.serialNumber, q)
		);
		if (keyword) conditions.push(keyword);
	}
	return db
		.select()
		.from(warrantyEntries)
		.where(and(...conditions))
		.orderBy(options.archived ? desc(warrantyEntries.archivedAt) : asc(warrantyEntries.warrantyEndAt))
		.all();
}

export function updateWarrantyEntry(db: Db, householdId: string, id: string, input: WarrantyEntryInput): boolean {
	const result = db
		.update(warrantyEntries)
		.set({
			name: input.name,
			category: input.category,
			manufacturer: input.manufacturer,
			modelNumber: input.modelNumber,
			serialNumber: input.serialNumber,
			purchasedAt: input.purchasedAt,
			purchasedFrom: input.purchasedFrom,
			price: input.price,
			warrantyMonths: input.warrantyMonths,
			warrantyEndAt: resolveWarrantyEndAt(input.purchasedAt, input.warrantyMonths, input.warrantyEndAtOverride),
			contactNote: input.contactNote,
			memo: input.memo,
			updatedAt: Date.now()
		})
		.where(and(eq(warrantyEntries.id, id), eq(warrantyEntries.householdId, householdId)))
		.run();
	return result.changes > 0;
}

export function archiveWarrantyEntry(db: Db, householdId: string, id: string): boolean {
	return (
		db
			.update(warrantyEntries)
			.set({ archivedAt: Date.now() })
			.where(and(eq(warrantyEntries.id, id), eq(warrantyEntries.householdId, householdId), isNull(warrantyEntries.archivedAt)))
			.run().changes > 0
	);
}

export function unarchiveWarrantyEntry(db: Db, householdId: string, id: string): boolean {
	return (
		db
			.update(warrantyEntries)
			.set({ archivedAt: null })
			.where(and(eq(warrantyEntries.id, id), eq(warrantyEntries.householdId, householdId), isNotNull(warrantyEntries.archivedAt)))
			.run().changes > 0
	);
}

/** 保証登録を削除する。所属世帯のものでなければ何もしない。戻り値は削除前の添付画像一覧(実ファイル削除は呼び出し側)。 */
export function deleteWarrantyEntry(db: Db, householdId: string, id: string): AttachmentRow[] {
	return db.transaction((tx) => {
		const entry = tx
			.select({ id: warrantyEntries.id })
			.from(warrantyEntries)
			.where(and(eq(warrantyEntries.id, id), eq(warrantyEntries.householdId, householdId)))
			.get();
		if (!entry) return [];
		const files = tx.select().from(attachments).where(eq(attachments.entryId, id)).all();
		tx.delete(warrantyEntries).where(eq(warrantyEntries.id, id)).run();
		return files;
	});
}

// --- 添付画像のメタデータ(ファイル実体は attachmentStorage.ts) ---

export function addAttachment(db: Db, entryId: string, filePath: string, mimeType: string): AttachmentRow {
	const nextPosition =
		(db
			.select({ value: attachments.position })
			.from(attachments)
			.where(eq(attachments.entryId, entryId))
			.orderBy(desc(attachments.position))
			.get()?.value ?? -1) + 1;
	const row: AttachmentRow = { id: newId(), entryId, filePath, mimeType, position: nextPosition, createdAt: Date.now() };
	db.insert(attachments).values(row).run();
	return row;
}

export function listAttachments(db: Db, entryId: string): AttachmentRow[] {
	return db.select().from(attachments).where(eq(attachments.entryId, entryId)).orderBy(asc(attachments.position)).all();
}

/** 世帯の所有権を確認したうえで添付画像を1件取得する(画像配信用)。 */
export function getAttachmentForHousehold(db: Db, householdId: string, id: string): AttachmentRow | null {
	const row = db
		.select({ attachment: attachments })
		.from(attachments)
		.innerJoin(warrantyEntries, eq(attachments.entryId, warrantyEntries.id))
		.where(and(eq(attachments.id, id), eq(warrantyEntries.householdId, householdId)))
		.get();
	return row?.attachment ?? null;
}

/** entryId 配下の添付画像を削除する(世帯の所有権は呼び出し側で確認済みの前提)。 */
export function deleteAttachment(db: Db, entryId: string, id: string): AttachmentRow | null {
	const row = db
		.select()
		.from(attachments)
		.where(and(eq(attachments.id, id), eq(attachments.entryId, entryId)))
		.get();
	if (!row) return null;
	db.delete(attachments).where(eq(attachments.id, id)).run();
	return row;
}
