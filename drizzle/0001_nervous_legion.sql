CREATE TABLE `notification_log` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`crew_id` text NOT NULL,
	`event_type` text NOT NULL,
	`channel` text NOT NULL,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`data` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`sent_at` integer,
	`read_at` integer,
	`failed_at` integer,
	`retry_count` integer DEFAULT 0 NOT NULL,
	`error_message` text,
	`external_id` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`crew_id`) REFERENCES `crews`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `notif_log_user_created` ON `notification_log` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `notif_log_user_status_created` ON `notification_log` (`user_id`,`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `notif_log_crew_created` ON `notification_log` (`crew_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `notif_log_status_created` ON `notification_log` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `notif_log_external_id` ON `notification_log` (`external_id`);--> statement-breakpoint
CREATE TABLE `notification_preferences` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`crew_id` text NOT NULL,
	`channels` text NOT NULL,
	`event_preferences` text NOT NULL,
	`quiet_hours` text NOT NULL,
	`digest` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`crew_id`) REFERENCES `crews`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `notif_pref_user_crew` ON `notification_preferences` (`user_id`,`crew_id`);--> statement-breakpoint
CREATE INDEX `notif_pref_crew` ON `notification_preferences` (`crew_id`);--> statement-breakpoint
CREATE TABLE `push_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`endpoint` text NOT NULL,
	`p256dh` text NOT NULL,
	`auth_key` text NOT NULL,
	`user_agent` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `push_tokens_user` ON `push_tokens` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `push_tokens_endpoint` ON `push_tokens` (`endpoint`);