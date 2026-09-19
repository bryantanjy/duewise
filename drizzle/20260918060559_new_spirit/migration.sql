CREATE TABLE `notification_cleanup` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`notification_id` text NOT NULL UNIQUE,
	`attempts` integer DEFAULT 0 NOT NULL,
	`last_error` text,
	`created_at` text NOT NULL
);
