PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_categories` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`name` text NOT NULL UNIQUE,
	`icon` text,
	`color` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_categories`(`id`, `name`, `icon`, `color`, `created_at`) SELECT `id`, `name`, `icon`, `color`, `created_at` FROM `categories`;--> statement-breakpoint
DROP TABLE `categories`;--> statement-breakpoint
ALTER TABLE `__new_categories` RENAME TO `categories`;--> statement-breakpoint
PRAGMA foreign_keys=ON;