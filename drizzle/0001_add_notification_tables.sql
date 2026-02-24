-- Add notification system tables
-- Migration: 0001_add_notification_tables

CREATE TABLE `notification_preferences` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`crew_id` text NOT NULL,
	`enable_push` integer DEFAULT true NOT NULL,
	`enable_email` integer DEFAULT true NOT NULL,
	`enable_sms` integer DEFAULT false NOT NULL,
	`sms_phone_number` text,
	`event_preferences` text DEFAULT '{"task_created":{"push":true,"email":true,"sms":false},"task_assigned":{"push":true,"email":true,"sms":true},"task_claimed":{"push":true,"email":true,"sms":false},"task_completed":{"push":true,"email":true,"sms":false},"task_cancelled":{"push":true,"email":false,"sms":false},"member_joined":{"push":true,"email":false,"sms":false},"milestone_logged":{"push":false,"email":false,"sms":false},"streak_bonus":{"push":true,"email":true,"sms":false}}',
	`quiet_hours_enabled` integer DEFAULT true NOT NULL,
	`quiet_hours_start` text DEFAULT '22:00',
	`quiet_hours_end` text DEFAULT '08:00',
	`timezone` text DEFAULT 'America/New_York',
	`enable_weekly_digest` integer DEFAULT true NOT NULL,
	`digest_day` text DEFAULT 'sunday',
	`digest_time` text DEFAULT '09:00',
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade,
	FOREIGN KEY (`crew_id`) REFERENCES `crews`(`id`) ON DELETE cascade
);

CREATE UNIQUE INDEX `user_crew_prefs_unique` ON `notification_preferences` (`user_id`, `crew_id`);

CREATE TABLE `notification_log` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`crew_id` text NOT NULL,
	`event_type` text NOT NULL,
	`channel` text NOT NULL,
	`recipient_email` text,
	`recipient_phone` text,
	`recipient_push_token` text,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`data` text,
	`status` text NOT NULL,
	`error_message` text,
	`external_id` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`sent_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade,
	FOREIGN KEY (`crew_id`) REFERENCES `crews`(`id`) ON DELETE cascade
);

CREATE TABLE `push_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`token` text NOT NULL,
	`platform` text NOT NULL,
	`device_model` text,
	`device_name` text,
	`app_version` text,
	`is_active` integer DEFAULT true NOT NULL,
	`last_used` integer DEFAULT (unixepoch()) NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade
);

CREATE UNIQUE INDEX `push_tokens_token_unique` ON `push_tokens` (`token`);
