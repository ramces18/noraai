CREATE TABLE `users` (`id` text PRIMARY KEY NOT NULL, `email` text NOT NULL, `display_name` text NOT NULL, `theme` text DEFAULT 'light' NOT NULL, `tone` text DEFAULT 'warm' NOT NULL, `created_at` integer NOT NULL, `last_login_at` integer NOT NULL);
CREATE TABLE `conversations` (`id` text PRIMARY KEY NOT NULL, `user_id` text NOT NULL, `title` text NOT NULL, `created_at` integer NOT NULL, `updated_at` integer NOT NULL, FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade);
CREATE INDEX `idx_conversations_user_updated` ON `conversations` (`user_id`,`updated_at`);
CREATE TABLE `messages` (`id` text PRIMARY KEY NOT NULL, `conversation_id` text NOT NULL, `role` text NOT NULL, `content` text NOT NULL, `created_at` integer NOT NULL, FOREIGN KEY (`conversation_id`) REFERENCES `conversations`(`id`) ON UPDATE no action ON DELETE cascade);
CREATE INDEX `idx_messages_conversation_created` ON `messages` (`conversation_id`,`created_at`);
PRAGMA optimize;
