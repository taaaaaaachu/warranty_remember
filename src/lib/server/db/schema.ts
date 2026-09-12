import { sqliteTable, text, integer, index, unique } from 'drizzle-orm/sqlite-core';

import type { InstanceRole, HouseholdRole } from '$lib/rbac';
export type { InstanceRole, HouseholdRole };

/** 会員ユーザー。ログインIDはユーザー名。 */
export const users = sqliteTable('users', {
	id: text('id').primaryKey(),
	username: text('username').notNull().unique(),
	passwordHash: text('password_hash').notNull(),
	/** 管理者リセット後、次回ログインでのパスワード変更を要求する。 */
	mustChangePassword: integer('must_change_password', { mode: 'boolean' }).notNull().default(false),
	/** インスタンス全体のロール。ブートストラップした最初の1人が super_admin。 */
	instanceRole: text('instance_role').notNull().$type<InstanceRole>().default('user'),
	createdAt: integer('created_at').notNull()
});

/** セッション。id はセッショントークンの SHA-256 ハッシュ(平文はDBに残さない)。 */
export const sessions = sqliteTable('sessions', {
	id: text('id').primaryKey(),
	userId: text('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	expiresAt: integer('expires_at').notNull()
});

/** パスワード検証の一時的な試行制限。値そのものは保存せず、目的別ハッシュを id に使う。 */
export const authAttempts = sqliteTable(
	'auth_attempts',
	{
		id: text('id').primaryKey(),
		scope: text('scope').notNull().$type<'user' | 'ip'>(),
		failedCount: integer('failed_count').notNull(),
		windowStartedAt: integer('window_started_at').notNull(),
		blockedUntil: integer('blocked_until'),
		updatedAt: integer('updated_at').notNull()
	},
	(t) => [index('auth_attempts_scope_updated_idx').on(t.scope, t.updatedAt)]
);

/** 世帯。保証登録データを共有する単位。 */
export const households = sqliteTable('households', {
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	createdAt: integer('created_at').notNull()
});

/** 所属。ユーザーと世帯の多対多。世帯内ロールを持つ。 */
export const memberships = sqliteTable(
	'memberships',
	{
		id: text('id').primaryKey(),
		userId: text('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		householdId: text('household_id')
			.notNull()
			.references(() => households.id, { onDelete: 'cascade' }),
		role: text('role').notNull().$type<HouseholdRole>().default('member'),
		createdAt: integer('created_at').notNull()
	},
	(t) => [
		unique('memberships_user_household_uq').on(t.userId, t.householdId),
		index('memberships_user_idx').on(t.userId),
		index('memberships_household_idx').on(t.householdId)
	]
);

/** owner交代の保留申請。世帯ごとに保留は1件だけ。 */
export const ownershipTransfers = sqliteTable(
	'ownership_transfers',
	{
		id: text('id').primaryKey(),
		householdId: text('household_id')
			.notNull()
			.references(() => households.id, { onDelete: 'cascade' }),
		currentOwnerId: text('current_owner_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		candidateUserId: text('candidate_user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		createdAt: integer('created_at').notNull()
	},
	(t) => [
		unique('ownership_transfers_household_uq').on(t.householdId),
		index('ownership_transfers_candidate_idx').on(t.candidateUserId)
	]
);

/** 招待コード。特定の世帯へメンバーを招く。単回使用。 */
export const invites = sqliteTable(
	'invites',
	{
		id: text('id').primaryKey(),
		code: text('code').notNull().unique(),
		/** 招く先の世帯。 */
		householdId: text('household_id')
			.notNull()
			.references(() => households.id, { onDelete: 'cascade' }),
		/** 発行者。削除されたら SET NULL(履歴は残す)。 */
		createdBy: text('created_by').references(() => users.id, { onDelete: 'set null' }),
		createdAt: integer('created_at').notNull(),
		/** 有効期限(epoch ミリ秒)。null なら無期限。 */
		expiresAt: integer('expires_at'),
		/** 使用者。未使用なら null。 */
		usedBy: text('used_by').references(() => users.id, { onDelete: 'set null' }),
		usedAt: integer('used_at'),
		/** 無効化日時。null なら未無効化。 */
		revokedAt: integer('revoked_at')
	},
	(t) => [index('invites_household_idx').on(t.householdId)]
);

/** 保証登録。1回の購入=1件。世帯が所有する。 */
export const warrantyEntries = sqliteTable(
	'warranty_entries',
	{
		id: text('id').primaryKey(),
		householdId: text('household_id')
			.notNull()
			.references(() => households.id, { onDelete: 'cascade' }),
		name: text('name').notNull(),
		category: text('category'),
		manufacturer: text('manufacturer'),
		modelNumber: text('model_number'),
		serialNumber: text('serial_number'),
		purchasedAt: integer('purchased_at').notNull(),
		purchasedFrom: text('purchased_from'),
		price: integer('price'),
		/** 保証終了日から自動計算するための入力補助値。手動上書き後は null に戻す。 */
		warrantyMonths: integer('warranty_months'),
		/** 保証終了日。自動計算 or 手動上書きのいずれかで必ず1つの値を持つ。 */
		warrantyEndAt: integer('warranty_end_at').notNull(),
		contactNote: text('contact_note'),
		memo: text('memo'),
		/** アーカイブ日時。null なら通常一覧に表示する。 */
		archivedAt: integer('archived_at'),
		createdAt: integer('created_at').notNull(),
		updatedAt: integer('updated_at').notNull()
	},
	(t) => [
		index('warranty_entries_household_idx').on(t.householdId),
		index('warranty_entries_household_end_idx').on(t.householdId, t.warrantyEndAt)
	]
);

/** 保証登録に添付する画像。ファイル実体はローカルファイルシステム、DBにはパスのみ。 */
export const attachments = sqliteTable(
	'attachments',
	{
		id: text('id').primaryKey(),
		entryId: text('entry_id')
			.notNull()
			.references(() => warrantyEntries.id, { onDelete: 'cascade' }),
		/** UPLOAD_DIR からの相対パス。 */
		filePath: text('file_path').notNull(),
		mimeType: text('mime_type').notNull(),
		position: integer('position').notNull(),
		createdAt: integer('created_at').notNull()
	},
	(t) => [index('attachments_entry_idx').on(t.entryId)]
);

export type UserRow = typeof users.$inferSelect;
export type SessionRow = typeof sessions.$inferSelect;
export type AuthAttemptRow = typeof authAttempts.$inferSelect;
export type HouseholdRow = typeof households.$inferSelect;
export type MembershipRow = typeof memberships.$inferSelect;
export type OwnershipTransferRow = typeof ownershipTransfers.$inferSelect;
export type InviteRow = typeof invites.$inferSelect;
export type WarrantyEntryRow = typeof warrantyEntries.$inferSelect;
export type AttachmentRow = typeof attachments.$inferSelect;
