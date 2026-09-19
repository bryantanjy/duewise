import { eq } from 'drizzle-orm';
import { isRunningInExpoGo } from 'expo';
import { Platform } from 'react-native';

import { db } from '@/db';
import { itemHistory, items, notificationCleanup, reminders } from '@/db/schema';
import {
  createItemOperations,
  oldNotificationIds,
  type ItemOperationRepository,
  type StoredReminder,
} from '@/services/item-operations';
import {
  enqueueNotificationCleanup,
  processNotificationCleanup,
} from '@/services/notification-cleanup';
import { notificationRuntimeSupported } from '@/utils/notification-runtime';

export { itemOperationResult, oldNotificationIds } from '@/services/item-operations';
export { archivedReminderRows } from '@/services/item-operations';

type NotificationService = typeof import('./notifications');

async function loadNotificationService(): Promise<NotificationService | undefined> {
  const runningInAndroidExpoGo = Platform.OS === 'android' && isRunningInExpoGo();
  if (!notificationRuntimeSupported(Platform.OS, runningInAndroidExpoGo)) return undefined;
  return import('./notifications');
}

export type CreateItemInput = {
  categoryId: number;
  dateType: string;
  importance: string;
  name: string;
  notes?: string;
  reminderDays: number[];
  repeatType: 'none' | 'yearly';
  targetDate: string;
};

export type CreateItemResult = {
  itemId: number;
  scheduledReminderCount: number;
  skippedReminderCount: number;
};

type ItemTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

function itemValues(input: CreateItemInput) {
  return {
    categoryId: input.categoryId,
    dateType: input.dateType,
    importance: input.importance,
    name: input.name.trim(),
    notes: input.notes?.trim() || null,
    repeatType: input.repeatType,
    targetDate: input.targetDate,
  };
}

function insertReminders(tx: ItemTransaction, itemId: number, rows: StoredReminder[]) {
  if (rows.length > 0) {
    tx.insert(reminders).values(rows.map((row) => ({ ...row, itemId }))).run();
  }
}

function replaceReminders(tx: ItemTransaction, itemId: number, rows: StoredReminder[]) {
  tx.delete(reminders).where(eq(reminders.itemId, itemId)).run();
  insertReminders(tx, itemId, rows);
}

function enqueueOldIds(tx: ItemTransaction, ids: string[]) {
  if (ids.length > 0) {
    tx.insert(notificationCleanup)
      .values(ids.map((notificationId) => ({ notificationId })))
      .onConflictDoNothing().run();
  }
}

// Expo's Drizzle driver commits when this synchronous callback returns.
// Every query is executed with .run()/.all(); no scheduling or await occurs in it.
const repository: ItemOperationRepository = {
  async createItemRecord(input) {
    return db.transaction((tx) => {
      const [created] = tx.insert(items).values(itemValues(input)).returning({ id: items.id }).all();
      return created.id;
    });
  },
  async getItemBundle(itemId) {
    return db.transaction((tx) => {
      const [item] = tx.select().from(items).where(eq(items.id, itemId)).all();
      if (!item) return undefined;
      const rows = tx.select({ daysBefore: reminders.daysBefore, notificationId: reminders.notificationId })
        .from(reminders).where(eq(reminders.itemId, itemId)).orderBy(reminders.id).all();
      return { item, reminders: rows };
    });
  },
  async commitCreatedReminders(itemId, rows) {
    db.transaction((tx) => insertReminders(tx, itemId, rows));
  },
  async commitEdit({ input, itemId, oldNotificationIds: ids, reminders: rows }) {
    db.transaction((tx) => {
      tx.update(items).set({ ...itemValues(input), updatedAt: new Date().toISOString() })
        .where(eq(items.id, itemId)).run();
      replaceReminders(tx, itemId, rows);
      enqueueOldIds(tx, ids);
    });
  },
  async commitRenew({ itemId, newTargetDate, oldNotificationIds: ids, previousTargetDate, reminders: rows }) {
    db.transaction((tx) => {
      tx.insert(itemHistory).values({
        action: 'renewed', itemId, newDate: newTargetDate, previousDate: previousTargetDate,
      }).run();
      tx.update(items).set({ targetDate: newTargetDate, updatedAt: new Date().toISOString() })
        .where(eq(items.id, itemId)).run();
      replaceReminders(tx, itemId, rows);
      enqueueOldIds(tx, ids);
    });
  },
  async commitArchive({ itemId, oldNotificationIds: ids }) {
    db.transaction((tx) => {
      tx.update(items).set({ archived: true, updatedAt: new Date().toISOString() })
        .where(eq(items.id, itemId)).run();
      tx.update(reminders).set({ notificationId: null }).where(eq(reminders.itemId, itemId)).run();
      enqueueOldIds(tx, ids);
    });
  },
  async commitRestore({ itemId, reminders: rows }) {
    db.transaction((tx) => {
      tx.update(items).set({ archived: false, updatedAt: new Date().toISOString() })
        .where(eq(items.id, itemId)).run();
      replaceReminders(tx, itemId, rows);
    });
  },
  async commitDelete({ itemId, oldNotificationIds: ids }) {
    db.transaction((tx) => {
      enqueueOldIds(tx, ids);
      tx.delete(items).where(eq(items.id, itemId)).run();
    });
  },
  async deleteProvisionalItem(itemId) {
    db.transaction((tx) => {
      tx.delete(items).where(eq(items.id, itemId)).run();
    });
  },
};

const operations = createItemOperations({
  repository,
  schedule: async (input) => {
    const service = await loadNotificationService();
    return service ? service.deviceNotificationAdapter.schedule(input) : null;
  },
  cleanup: async (ids) => {
    await enqueueNotificationCleanup(ids);
    await processNotificationCleanup();
  },
});

async function reportCompensationFailure<T>(operation: string, work: () => Promise<T>): Promise<T> {
  try {
    return await work();
  } catch (error) {
    if (error instanceof Error && 'compensationErrors' in error) {
      console.error(`Unable to complete compensation for ${operation}.`, error.compensationErrors);
    }
    throw error;
  }
}

export async function createItem(input: CreateItemInput): Promise<CreateItemResult> {
  return reportCompensationFailure('createItem', () => operations.createItem(input));
}

export async function updateItem(itemId: number, input: CreateItemInput): Promise<CreateItemResult> {
  return reportCompensationFailure('updateItem', () => operations.updateItem(itemId, input));
}

export async function renewItem(itemId: number): Promise<CreateItemResult> {
  return reportCompensationFailure('renewItem', () => operations.renewItem(itemId));
}

export async function archiveItem(itemId: number): Promise<void> {
  return reportCompensationFailure('archiveItem', () => operations.archiveItem(itemId));
}

export async function restoreItem(itemId: number): Promise<CreateItemResult> {
  return reportCompensationFailure('restoreItem', () => operations.restoreItem(itemId));
}

export async function deleteItem(itemId: number): Promise<void> {
  return reportCompensationFailure('deleteItem', () => operations.deleteItem(itemId));
}
