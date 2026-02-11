CREATE TABLE `activity_feed` (
	`id` text PRIMARY KEY NOT NULL,
	`crew_id` text NOT NULL,
	`event_type` text NOT NULL,
	`actor_id` text NOT NULL,
	`data` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`crew_id`) REFERENCES `crews`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`actor_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `bids` (
	`id` text PRIMARY KEY NOT NULL,
	`task_id` text NOT NULL,
	`user_id` text NOT NULL,
	`bid_amount` integer NOT NULL,
	`comment` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `crew_members` (
	`id` text PRIMARY KEY NOT NULL,
	`crew_id` text NOT NULL,
	`user_id` text NOT NULL,
	`role` text NOT NULL,
	`stats` text DEFAULT '{"tasksCompleted":0,"pointsSpent":0,"auctionWins":0,"totalResponseTimeMs":0,"responseCount":0,"currentStreak":0,"longestStreak":0}',
	`badges` text DEFAULT '[]',
	`joined_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`crew_id`) REFERENCES `crews`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `crew_member_unique` ON `crew_members` (`crew_id`,`user_id`);--> statement-breakpoint
CREATE TABLE `crews` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`card_holder_id` text NOT NULL,
	`point_balance` integer DEFAULT 500 NOT NULL,
	`invite_code` text NOT NULL,
	`settings` text DEFAULT '{"defaultPoints":500,"allowNegativeBalance":true}',
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`card_holder_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `crews_invite_code_unique` ON `crews` (`invite_code`);--> statement-breakpoint
CREATE TABLE `milestones` (
	`id` text PRIMARY KEY NOT NULL,
	`crew_id` text NOT NULL,
	`user_id` text NOT NULL,
	`milestone_type` text NOT NULL,
	`points_earned` integer NOT NULL,
	`note` text,
	`is_streak_bonus` integer DEFAULT false NOT NULL,
	`logged_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`crew_id`) REFERENCES `crews`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `self_care_routines` (
	`id` text PRIMARY KEY NOT NULL,
	`crew_id` text NOT NULL,
	`name` text NOT NULL,
	`milestone_type` text NOT NULL,
	`point_value` integer NOT NULL,
	`emoji` text NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`crew_id`) REFERENCES `crews`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `task_menu_templates` (
	`id` text PRIMARY KEY NOT NULL,
	`crew_id` text NOT NULL,
	`title` text NOT NULL,
	`category` text NOT NULL,
	`default_points` integer NOT NULL,
	`emoji` text NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	FOREIGN KEY (`crew_id`) REFERENCES `crews`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`crew_id` text NOT NULL,
	`created_by` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`category` text NOT NULL,
	`point_cost` integer NOT NULL,
	`request_mode` text NOT NULL,
	`assigned_to` text,
	`claimed_by` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`urgency` text DEFAULT 'whenever' NOT NULL,
	`due_by` integer,
	`auction_settings` text,
	`final_point_cost` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`completed_at` integer,
	FOREIGN KEY (`crew_id`) REFERENCES `crews`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`assigned_to`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`claimed_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`display_name` text NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`avatar_url` text,
	`has_seen_tour` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);