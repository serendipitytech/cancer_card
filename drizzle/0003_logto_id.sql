PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_users` (
	`id` text PRIMARY KEY NOT NULL,
	`display_name` text NOT NULL,
	`email` text NOT NULL,
	`password_hash` text,
	`logto_id` text,
	`avatar_url` text,
	`has_seen_tour` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_users`("id", "display_name", "email", "password_hash", "avatar_url", "has_seen_tour", "created_at") SELECT "id", "display_name", "email", "password_hash", "avatar_url", "has_seen_tour", "created_at" FROM `users`;--> statement-breakpoint
DROP TABLE `users`;--> statement-breakpoint
ALTER TABLE `__new_users` RENAME TO `users`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_logto_id_unique` ON `users` (`logto_id`);