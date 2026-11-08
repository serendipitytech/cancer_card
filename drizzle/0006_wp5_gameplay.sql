-- WP5 gameplay finish + cleanup.
-- 1. Add the per-user IANA timezone used for streak/quiet-hours day boundaries.
-- 2. Drop the legacy password_hash column: Logto owns credentials now and no
--    code reads or writes it after the account-deletion scrub stopped nulling it.
ALTER TABLE `users` ADD `timezone` text;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `password_hash`;