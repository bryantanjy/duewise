export type ReminderStagingInput = {
  itemId: number;
  itemName: string;
  targetDate: string;
  reminderTime?: string;
  reminderDays: number[];
};

export type ReminderScheduleInput = {
  daysBefore: number;
  itemId: number;
  itemName: string;
  targetDate: string;
  reminderTime?: string;
};

export type ReminderSchedule = (
  input: ReminderScheduleInput,
) => Promise<string | null>;

export type StagedReminderResult = {
  rows: { daysBefore: number; notificationId: string | null }[];
  createdNotificationIds: string[];
  skippedReminderCount: number;
};

export class ReminderStagingError extends Error {
  readonly createdNotificationIds: string[];

  constructor(message: string, createdNotificationIds: string[]) {
    super(message);
    this.name = 'ReminderStagingError';
    this.createdNotificationIds = [...createdNotificationIds];
  }
}

export async function stageReminders(
  input: ReminderStagingInput,
  schedule: ReminderSchedule,
): Promise<StagedReminderResult> {
  const rows: StagedReminderResult['rows'] = [];
  const createdNotificationIds: string[] = [];
  let skippedReminderCount = 0;

  for (const daysBefore of input.reminderDays) {
    let notificationId: string | null;

    try {
      notificationId = await schedule({
        daysBefore,
        itemId: input.itemId,
        itemName: input.itemName,
        targetDate: input.targetDate,
        ...(input.reminderTime ? { reminderTime: input.reminderTime } : {}),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new ReminderStagingError(message, createdNotificationIds);
    }

    if (notificationId === null) {
      skippedReminderCount += 1;
    } else {
      createdNotificationIds.push(notificationId);
    }

    rows.push({ daysBefore, notificationId });
  }

  return { rows, createdNotificationIds, skippedReminderCount };
}
