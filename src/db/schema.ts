import {
  integer,
  sqliteTable,
  text,
} from 'drizzle-orm/sqlite-core';

export const categories = sqliteTable('categories', {
  id: integer('id').primaryKey({ autoIncrement: true }),

  name: text('name').notNull(),
  icon: text('icon'),
  color: text('color'),

  createdAt: text('created_at')
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const items = sqliteTable('items', {
  id: integer('id').primaryKey({ autoIncrement: true }),

  name: text('name').notNull(),

  categoryId: integer('category_id')
    .references(() => categories.id),

  dateType: text('date_type').notNull(),

  targetDate: text('target_date').notNull(),

  repeatType: text('repeat_type')
    .notNull()
    .default('none'),

  importance: text('importance')
    .notNull()
    .default('normal'),

  notes: text('notes'),

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