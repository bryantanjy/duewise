export const REMINDER_CATEGORY = 'duewise_reminder';
export const SNOOZE_ACTION = 'duewise_snooze_hour';
export const COMPLETE_ACTION = 'duewise_complete';

export function reminderActionData(data: unknown) {
  if (!data || typeof data !== 'object') return undefined;
  const value = data as Record<string, unknown>;
  if (value.type !== 'item-reminder' || typeof value.itemId !== 'number' ||
      !Number.isSafeInteger(value.itemId) || value.itemId <= 0 ||
      typeof value.targetDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value.targetDate)) return undefined;
  return { itemId: value.itemId, targetDate: value.targetDate };
}
