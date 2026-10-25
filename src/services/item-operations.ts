import type { CreateItemInput, CreateItemResult } from './items';
import type { NotificationAdapter } from './notifications';
import { nextFutureOccurrence } from '../utils/recurrence';
import { uniqueNotificationIds } from '../utils/notification-cleanup-model';
import {
  ReminderStagingError,
  stageReminders,
  type ReminderStagingInput,
  type StagedReminderResult,
} from './reminder-staging';

export type StoredReminder = { daysBefore: number; notificationId: string | null; isSnooze?: boolean };
export type StoredItemBundle = {
  item: {
    archived: boolean;
    id: number;
    name: string;
    repeatType: string;
    repeatInterval?: number;
    targetDate: string;
    reminderTime?: string;
  };
  reminders: StoredReminder[];
};

export type ItemOperationRepository = {
  createItemRecord(input: CreateItemInput): Promise<number>;
  getItemBundle(itemId: number): Promise<StoredItemBundle | undefined>;
  commitCreatedReminders(itemId: number, rows: StoredReminder[]): Promise<void>;
  commitRescheduledReminders(itemId: number, rows: StoredReminder[], oldIds: string[]): Promise<void>;
  commitEdit(args: {
    input: CreateItemInput;
    itemId: number;
    oldNotificationIds: string[];
    reminders: StoredReminder[];
  }): Promise<void>;
  commitRenew(args: {
    itemId: number;
    newTargetDate: string;
    oldNotificationIds: string[];
    previousTargetDate: string;
    reminders: StoredReminder[];
  }): Promise<void>;
  commitArchive(args: { itemId: number; oldNotificationIds: string[] }): Promise<void>;
  commitRestore(args: { itemId: number; reminders: StoredReminder[] }): Promise<void>;
  commitDelete(args: { itemId: number; oldNotificationIds: string[] }): Promise<void>;
  deleteProvisionalItem(itemId: number): Promise<void>;
};

export type ItemOperationDependencies = {
  cleanup(ids: string[]): Promise<void>;
  repository: ItemOperationRepository;
  schedule: NotificationAdapter['schedule'];
};

export type ItemOperations = {
  createItem(input: CreateItemInput): Promise<CreateItemResult>;
  updateItem(itemId: number, input: CreateItemInput): Promise<CreateItemResult>;
  renewItem(itemId: number): Promise<CreateItemResult>;
  rescheduleItem(itemId: number): Promise<CreateItemResult>;
  archiveItem(itemId: number): Promise<void>;
  restoreItem(itemId: number): Promise<CreateItemResult>;
  deleteItem(itemId: number): Promise<void>;
};

export function oldNotificationIds(rows: { notificationId: string | null }[]) {
  return uniqueNotificationIds(rows.map(({ notificationId }) => notificationId));
}

export function itemOperationResult(
  itemId: number,
  staged: { createdNotificationIds: string[]; skippedReminderCount: number },
): CreateItemResult {
  return {
    itemId,
    scheduledReminderCount: staged.createdNotificationIds.length,
    skippedReminderCount: staged.skippedReminderCount,
  };
}

export function archivedReminderRows(rows: StoredReminder[]): StoredReminder[] {
  return rows.map(({ daysBefore }) => ({ daysBefore, notificationId: null }));
}

export function createItemOperations({
  cleanup,
  repository,
  schedule,
}: ItemOperationDependencies): ItemOperations {
  async function requireItem(itemId: number) {
    const bundle = await repository.getItemBundle(itemId);
    if (!bundle) throw new Error('Item not found.');
    return bundle;
  }

  async function stageAndCommit(
    input: ReminderStagingInput,
    commit: (staged: StagedReminderResult) => Promise<void>,
    deleteProvisional = false,
  ) {
    let staged: StagedReminderResult | undefined;
    try {
      staged = await stageReminders(input, schedule);
      await commit(staged);
      return staged;
    } catch (error) {
      const ids = error instanceof ReminderStagingError
        ? error.createdNotificationIds
        : staged?.createdNotificationIds ?? [];
      const compensationErrors: unknown[] = [];
      try {
        if (ids.length > 0) await cleanup(ids);
      } catch (cleanupError) {
        compensationErrors.push(cleanupError);
      }
      try {
        if (deleteProvisional) await repository.deleteProvisionalItem(input.itemId);
      } catch (deleteError) {
        compensationErrors.push(deleteError);
      }
      // Preserve the root cause and make secondary failures available to the UI boundary.
      try {
        if (error instanceof Error && compensationErrors.length > 0) {
          Object.defineProperty(error, 'compensationErrors', {
            value: compensationErrors, enumerable: false, configurable: true,
          });
        }
      } finally {
        throw error;
      }
    }
  }

  return {
    async rescheduleItem(itemId) {
      const bundle = await requireItem(itemId);
      if (bundle.item.archived) return { itemId, scheduledReminderCount: 0, skippedReminderCount: 0 };
      const oldIds = oldNotificationIds(bundle.reminders);
      const staged = await stageAndCommit({
        itemId, itemName: bundle.item.name, targetDate: bundle.item.targetDate,
        reminderTime: bundle.item.reminderTime,
        reminderDays: bundle.reminders.filter((row) => !row.isSnooze).map((row) => row.daysBefore),
      }, (result) => repository.commitRescheduledReminders(itemId, result.rows, oldIds));
      if (oldIds.length > 0) await cleanup(oldIds);
      return itemOperationResult(itemId, staged);
    },

    async createItem(input) {
      const itemId = await repository.createItemRecord(input);
      const staged = await stageAndCommit({
        itemId, itemName: input.name.trim(), reminderDays: input.reminderDays,
        targetDate: input.targetDate,
        reminderTime: input.reminderTime,
      }, (result) => repository.commitCreatedReminders(itemId, result.rows), true);
      return itemOperationResult(itemId, staged);
    },

    async updateItem(itemId, input) {
      const bundle = await requireItem(itemId);
      const oldIds = oldNotificationIds(bundle.reminders);
      const staged = await stageAndCommit({
        itemId, itemName: input.name.trim(), reminderDays: input.reminderDays,
        targetDate: input.targetDate,
        reminderTime: input.reminderTime,
      }, (result) => repository.commitEdit({
        input, itemId, oldNotificationIds: oldIds, reminders: result.rows,
      }));
      // After commit, cleanup failures must never compensate the new, committed IDs.
      if (oldIds.length > 0) await cleanup(oldIds);
      return itemOperationResult(itemId, staged);
    },

    async renewItem(itemId) {
      const bundle = await requireItem(itemId);
      if (bundle.item.archived || bundle.item.repeatType === 'none') {
        throw new Error('Only active repeating items can be renewed.');
      }
      const newTargetDate = nextFutureOccurrence(bundle.item.targetDate, bundle.item.repeatType, bundle.item.repeatInterval);
      const oldIds = oldNotificationIds(bundle.reminders);
      const staged = await stageAndCommit({
        itemId, itemName: bundle.item.name,
        reminderDays: bundle.reminders.filter((row) => !row.isSnooze).map(({ daysBefore }) => daysBefore),
        targetDate: newTargetDate,
        reminderTime: bundle.item.reminderTime,
      }, (result) => repository.commitRenew({
        itemId, newTargetDate, oldNotificationIds: oldIds,
        previousTargetDate: bundle.item.targetDate, reminders: result.rows,
      }));
      if (oldIds.length > 0) await cleanup(oldIds);
      return itemOperationResult(itemId, staged);
    },

    async archiveItem(itemId) {
      const bundle = await requireItem(itemId);
      const oldIds = oldNotificationIds(bundle.reminders);
      await repository.commitArchive({ itemId, oldNotificationIds: oldIds });
      if (oldIds.length > 0) await cleanup(oldIds);
    },

    async restoreItem(itemId) {
      const bundle = await requireItem(itemId);
      if (!bundle.item.archived) {
        throw new Error('Only archived items can be restored.');
      }
      const staged = await stageAndCommit({
        itemId,
        itemName: bundle.item.name,
        reminderDays: bundle.reminders.filter((row) => !row.isSnooze).map(({ daysBefore }) => daysBefore),
        targetDate: bundle.item.targetDate,
        reminderTime: bundle.item.reminderTime,
      }, (result) => repository.commitRestore({ itemId, reminders: result.rows }));
      return itemOperationResult(itemId, staged);
    },

    async deleteItem(itemId) {
      const bundle = await requireItem(itemId);
      const oldIds = oldNotificationIds(bundle.reminders);
      await repository.commitDelete({ itemId, oldNotificationIds: oldIds });
      if (oldIds.length > 0) await cleanup(oldIds);
    },
  };
}
