CREATE TABLE `cloud_state` (
	`key` text PRIMARY KEY,
	`value` text NOT NULL
);
--> statement-breakpoint
ALTER TABLE `items` ADD `sync_id` text;