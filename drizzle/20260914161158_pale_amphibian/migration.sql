CREATE TABLE `categories` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`name` text NOT NULL,
	`icon` text,
	`color` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `item_history` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`item_id` integer NOT NULL,
	`previous_date` text,
	`new_date` text,
	`action` text NOT NULL,
	`created_at` text NOT NULL,
	CONSTRAINT `fk_item_history_item_id_items_id_fk` FOREIGN KEY (`item_id`) REFERENCES `items`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `items` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`name` text NOT NULL,
	`category_id` integer,
	`date_type` text NOT NULL,
	`target_date` text NOT NULL,
	`repeat_type` text DEFAULT 'none' NOT NULL,
	`importance` text DEFAULT 'normal' NOT NULL,
	`notes` text,
	`archived` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	CONSTRAINT `fk_items_category_id_categories_id_fk` FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`)
);
--> statement-breakpoint
CREATE TABLE `reminders` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`item_id` integer NOT NULL,
	`days_before` integer NOT NULL,
	`notification_id` text,
	`enabled` integer DEFAULT true NOT NULL,
	CONSTRAINT `fk_reminders_item_id_items_id_fk` FOREIGN KEY (`item_id`) REFERENCES `items`(`id`) ON DELETE CASCADE
);
