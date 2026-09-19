import assert from 'node:assert/strict';
import test from 'node:test';
import './support/register-typescript.mjs';

const { archivedReminderRows, oldNotificationIds } =
  await import('../src/services/item-operations.ts');

test('archive retains reminder days while clearing native identifiers', () => {
  const rows = [
    { daysBefore: 30, notificationId: 'native-30' },
    { daysBefore: 0, notificationId: null },
  ];

  assert.deepEqual(archivedReminderRows(rows), [
    { daysBefore: 30, notificationId: null },
    { daysBefore: 0, notificationId: null },
  ]);
  assert.deepEqual(oldNotificationIds(rows), ['native-30']);
});
