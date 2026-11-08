ALTER TABLE `crews` ADD `invite_expires_at` integer;--> statement-breakpoint
ALTER TABLE `crews` ADD `invite_max_uses` integer;--> statement-breakpoint
ALTER TABLE `crews` ADD `invite_use_count` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `crews` ADD `invite_revoked_at` integer;--> statement-breakpoint
ALTER TABLE `crews` ADD `invite_bound_email` text;