-- Emotional companion, voluntary self-care records, and moments album.
-- There are intentionally no streak, score, penalty, or reset columns.
ALTER TABLE `users` ADD `companion_enabled` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `nora_use_care_data` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `nora_use_album_moments` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `companion_use_wellbeing` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `wellbeing_stats_enabled` integer DEFAULT true NOT NULL;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `companions` (
	`user_id` text PRIMARY KEY NOT NULL,
	`pet_type` text DEFAULT 'cat' NOT NULL,
	`name` text DEFAULT 'Lumi' NOT NULL,
	`appearance` text DEFAULT 'ink' NOT NULL,
	`accessory` text DEFAULT 'none' NOT NULL,
	`personality` text DEFAULT 'calm' NOT NULL,
	`communication_style` text DEFAULT 'words' NOT NULL,
	`unlocked_items` text DEFAULT '["cushion"]' NOT NULL,
	`bond_stage` integer DEFAULT 1 NOT NULL,
	`setup_complete` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`last_interaction_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `wellbeing_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`kind` text NOT NULL,
	`activity` text DEFAULT '' NOT NULL,
	`emotion` text DEFAULT '' NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`allow_nora` integer DEFAULT false NOT NULL,
	`happened_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_wellbeing_user_happened` ON `wellbeing_entries` (`user_id`,`happened_at`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `album_moments` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`text` text NOT NULL,
	`emotion` text DEFAULT '' NOT NULL,
	`photo_data` text,
	`personal_note` text DEFAULT '' NOT NULL,
	`allow_nora` integer DEFAULT false NOT NULL,
	`pet_reaction` text DEFAULT '' NOT NULL,
	`happened_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_album_user_happened` ON `album_moments` (`user_id`,`happened_at`);
