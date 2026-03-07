PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_push_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`token_type` text DEFAULT 'web' NOT NULL,
	`endpoint` text NOT NULL,
	`p256dh` text,
	`auth_key` text,
	`device_token` text,
	`user_agent` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_push_tokens`("id", "user_id", "token_type", "endpoint", "p256dh", "auth_key", "device_token", "user_agent", "created_at") SELECT "id", "user_id", "token_type", "endpoint", "p256dh", "auth_key", "device_token", "user_agent", "created_at" FROM `push_tokens`;--> statement-breakpoint
DROP TABLE `push_tokens`;--> statement-breakpoint
ALTER TABLE `__new_push_tokens` RENAME TO `push_tokens`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `push_tokens_user` ON `push_tokens` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `push_tokens_endpoint` ON `push_tokens` (`endpoint`);--> statement-breakpoint
CREATE UNIQUE INDEX `push_tokens_device_token` ON `push_tokens` (`device_token`);