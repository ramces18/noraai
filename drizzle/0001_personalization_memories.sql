ALTER TABLE `users` ADD `font_size` text DEFAULT 'medium' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `reduce_motion` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `messages` ADD `important` integer DEFAULT false NOT NULL;
