-- Transparent long-term memory, richer preferences, and password accounts.
ALTER TABLE `users` ADD `response_length` text DEFAULT 'balanced' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `memory_enabled` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `enter_to_send` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `high_contrast` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `chat_width` text DEFAULT 'comfortable' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `pronouns` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `about_me` text DEFAULT '' NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_users_email` ON `users` (`email`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `memories` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`content` text NOT NULL,
	`category` text DEFAULT 'personal' NOT NULL,
	`source_message_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`source_message_id`) REFERENCES `messages`(`id`) ON UPDATE no action ON DELETE set null
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_memories_user_updated` ON `memories` (`user_id`,`updated_at`);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `idx_memories_source_message` ON `memories` (`source_message_id`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `password_accounts` (
	`user_id` text PRIMARY KEY NOT NULL,
	`password_hash` text NOT NULL,
	`salt` text NOT NULL,
	`iterations` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
