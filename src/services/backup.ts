import { db } from '@/db';
import { categories, itemHistory, items, reminders } from '@/db/schema';
import { backupPreview, backupSchema, type Backup, type BackupItem } from '@/utils/backup';
import { rescheduleItem } from './items';

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

function snapshot(tx: Transaction): Backup {
  const storedCategories = new Map(tx.select().from(categories).all().map((category) => [category.id, category]));
  const storedReminders = tx.select().from(reminders).all();
  const storedHistory = tx.select().from(itemHistory).all();
  return backupSchema.parse({
    format: 'duewise-backup', version: 1, exportedAt: new Date().toISOString(),
    items: tx.select().from(items).all().map((item) => {
      const category = item.categoryId === null ? undefined : storedCategories.get(item.categoryId);
      return {
        name: item.name, category: category ? { name: category.name, icon: category.icon, color: category.color } : null,
        dateType: item.dateType, targetDate: item.targetDate, reminderTime: item.reminderTime,
        repeatType: item.repeatType, repeatInterval: item.repeatInterval, importance: item.importance,
        notes: item.notes, archived: item.archived, createdAt: item.createdAt, updatedAt: item.updatedAt,
        reminderDays: storedReminders.filter((row) => row.itemId === item.id && !row.isSnooze && row.enabled).map((row) => row.daysBefore),
        history: storedHistory.filter((row) => row.itemId === item.id).map((row) => ({
          action: row.action, previousDate: row.previousDate, newDate: row.newDate, createdAt: row.createdAt,
        })),
      };
    }),
  });
}

export function createBackup() { return db.transaction(snapshot); }

export function previewBackup(backup: Backup) {
  return backupPreview(backup, createBackup().items);
}

function insertItem(tx: Transaction, item: BackupItem, categoryIds: Map<string, number>) {
  let categoryId: number | null = null;
  if (item.category) {
    categoryId = categoryIds.get(item.category.name) ?? null;
    if (categoryId === null) {
      const [category] = tx.insert(categories).values(item.category).returning({ id: categories.id }).all();
      categoryId = category.id;
      categoryIds.set(item.category.name, categoryId);
    }
  }
  const { reminderDays, history } = item;
  const [created] = tx.insert(items).values({
    categoryId, name: item.name, dateType: item.dateType, targetDate: item.targetDate,
    reminderTime: item.reminderTime, repeatType: item.repeatType, repeatInterval: item.repeatInterval,
    importance: item.importance, notes: item.notes, archived: item.archived,
    createdAt: item.createdAt, updatedAt: item.updatedAt,
  }).returning({ id: items.id }).all();
  for (const daysBefore of reminderDays) tx.insert(reminders).values({ itemId: created.id, daysBefore, notificationId: null }).run();
  for (const entry of history) tx.insert(itemHistory).values({ ...entry, itemId: created.id }).run();
  return created.id;
}

export async function restoreBackup(input: Backup) {
  // Validate again at the write boundary and recheck duplicates inside the transaction.
  const backup = backupSchema.parse(input);
  const result = db.transaction((tx) => {
    const plan = backupPreview(backup, snapshot(tx).items);
    const categoryIds = new Map(tx.select().from(categories).all().map((row) => [row.name, row.id]));
    const imported = plan.additions.map((item) => ({ id: insertItem(tx, item, categoryIds), item }));
    return { imported, duplicates: plan.duplicates };
  });
  let scheduled = 0;
  let unscheduled = 0;
  for (const { id, item } of result.imported) {
    if (item.archived) continue;
    try {
      const reminders = await rescheduleItem(id);
      scheduled += reminders.scheduledReminderCount;
      unscheduled += reminders.skippedReminderCount;
    } catch {
      // Imported records are durable even if the OS cannot schedule their alerts.
      unscheduled += item.reminderDays.length;
    }
  }
  return { imported: result.imported.length, duplicates: result.duplicates, scheduled, unscheduled };
}
