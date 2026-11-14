import {
  integer,
  sqliteTable,
  text,
} from 'drizzle-orm/sqlite-core';

export const categories = sqliteTable('categories', {
  id: integer('id').primaryKey({ autoIncrement: true }),

  name: text('name').notNull().unique(),
  icon: text('icon'),
  color: text('color'),

  createdAt: text('created_at')
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const items = sqliteTable('items', {
  id: integer('id').primaryKey({ autoIncrement: true }),

  name: text('name').notNull(),
  syncId: text('sync_id'),

  categoryId: integer('category_id')
    .references(() => categories.id),

  dateType: text('date_type').notNull(),

  targetDate: text('target_date').notNull(),

  reminderTime: text('reminder_time').notNull().default('09:00'),

  repeatType: text('repeat_type')
    .notNull()
    .default('none'),

  repeatInterval: integer('repeat_interval').notNull().default(1),

  importance: text('importance')
    .notNull()
    .default('normal'),

  notes: text('notes'),
  costMinor: integer('cost_minor'),
  costCurrency: text('cost_currency'),

  archived: integer('archived', {
    mode: 'boolean',
  })
    .notNull()
    .default(false),

  createdAt: text('created_at')
    .notNull()
    .$defaultFn(() => new Date().toISOString()),

  updatedAt: text('updated_at')
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const reminders = sqliteTable('reminders', {
  id: integer('id').primaryKey({ autoIncrement: true }),

  itemId: integer('item_id')
    .notNull()
    .references(() => items.id, {
      onDelete: 'cascade',
    }),

  daysBefore: integer('days_before').notNull(),

  notificationId: text('notification_id'),

  isSnooze: integer('is_snooze', { mode: 'boolean' }).notNull().default(false),

  enabled: integer('enabled', {
    mode: 'boolean',
  })
    .notNull()
    .default(true),
});

export const itemHistory = sqliteTable('item_history', {
  id: integer('id').primaryKey({ autoIncrement: true }),

  itemId: integer('item_id')
    .notNull()
    .references(() => items.id, {
      onDelete: 'cascade',
    }),

  previousDate: text('previous_date'),

  newDate: text('new_date'),

  action: text('action').notNull(),

  createdAt: text('created_at')
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const notificationCleanup = sqliteTable('notification_cleanup', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  notificationId: text('notification_id').notNull().unique(),
  attempts: integer('attempts').notNull().default(0),
  lastError: text('last_error'),
  createdAt: text('created_at')
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const attachments = sqliteTable('attachments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  itemId: integer('item_id').notNull().references(() => items.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  mimeType: text('mime_type').notNull(),
  size: integer('size').notNull(),
  base64: text('base64').notNull(),
});

export const cloudState = sqliteTable('cloud_state', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});
