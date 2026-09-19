import assert from 'node:assert/strict';
import test from 'node:test';

let ReminderStagingError;
let stageReminders;
try {
  ({ ReminderStagingError, stageReminders } = await import('../src/services/reminder-staging.ts'));
} catch {}

const input = {
  itemId: 4,
  itemName: 'Road tax',
  reminderDays: [30, 7, 0],
  targetDate: '2027-09-18',
};

test('staging retains configured days and scheduled versus skipped counts', async () => {
  const result = await stageReminders(input, async ({ daysBefore }) =>
    daysBefore === 7 ? null : `native-${daysBefore}`,
  );
  assert.deepEqual(result.rows, [
    { daysBefore: 30, notificationId: 'native-30' },
    { daysBefore: 7, notificationId: null },
    { daysBefore: 0, notificationId: 'native-0' },
  ]);
  assert.deepEqual(result.createdNotificationIds, ['native-30', 'native-0']);
  assert.equal(result.skippedReminderCount, 1);
});

test('staging error exposes identifiers already created for compensation', async () => {
  await assert.rejects(
    stageReminders(input, async ({ daysBefore }) => {
      if (daysBefore === 7) throw new Error('native failure');
      return `native-${daysBefore}`;
    }),
    (error) => {
      assert.equal(error instanceof ReminderStagingError, true);
      assert.deepEqual(error.createdNotificationIds, ['native-30']);
      return true;
    },
  );
});
