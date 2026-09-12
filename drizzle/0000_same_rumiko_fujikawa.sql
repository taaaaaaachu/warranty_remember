CREATE TABLE `attachments` (
	`id` text PRIMARY KEY NOT NULL,
	`entry_id` text NOT NULL,
	`file_path` text NOT NULL,
	`mime_type` text NOT NULL,
	`position` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`entry_id`) REFERENCES `warranty_entries`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `attachments_entry_idx` ON `attachments` (`entry_id`);--> statement-breakpoint
CREATE TABLE `auth_attempts` (
	`id` text PRIMARY KEY NOT NULL,
	`scope` text NOT NULL,
	`failed_count` integer NOT NULL,
	`window_started_at` integer NOT NULL,
	`blocked_until` integer,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `auth_attempts_scope_updated_idx` ON `auth_attempts` (`scope`,`updated_at`);--> statement-breakpoint
CREATE TABLE `households` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `invites` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`household_id` text NOT NULL,
	`created_by` text,
	`created_at` integer NOT NULL,
	`expires_at` integer,
	`used_by` text,
	`used_at` integer,
	`revoked_at` integer,
	FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`used_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `invites_code_unique` ON `invites` (`code`);--> statement-breakpoint
CREATE INDEX `invites_household_idx` ON `invites` (`household_id`);--> statement-breakpoint
CREATE TABLE `memberships` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`household_id` text NOT NULL,
	`role` text DEFAULT 'member' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `memberships_user_idx` ON `memberships` (`user_id`);--> statement-breakpoint
CREATE INDEX `memberships_household_idx` ON `memberships` (`household_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `memberships_user_household_uq` ON `memberships` (`user_id`,`household_id`);--> statement-breakpoint
CREATE TABLE `ownership_transfers` (
	`id` text PRIMARY KEY NOT NULL,
	`household_id` text NOT NULL,
	`current_owner_id` text NOT NULL,
	`candidate_user_id` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`current_owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`candidate_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `ownership_transfers_candidate_idx` ON `ownership_transfers` (`candidate_user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `ownership_transfers_household_uq` ON `ownership_transfers` (`household_id`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`password_hash` text NOT NULL,
	`must_change_password` integer DEFAULT false NOT NULL,
	`instance_role` text DEFAULT 'user' NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);--> statement-breakpoint
CREATE TABLE `warranty_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`household_id` text NOT NULL,
	`name` text NOT NULL,
	`category` text,
	`manufacturer` text,
	`model_number` text,
	`serial_number` text,
	`purchased_at` integer NOT NULL,
	`purchased_from` text,
	`price` integer,
	`warranty_months` integer,
	`warranty_end_at` integer NOT NULL,
	`contact_note` text,
	`memo` text,
	`archived_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `warranty_entries_household_idx` ON `warranty_entries` (`household_id`);--> statement-breakpoint
CREATE INDEX `warranty_entries_household_end_idx` ON `warranty_entries` (`household_id`,`warranty_end_at`);