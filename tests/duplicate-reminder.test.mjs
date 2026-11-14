import test from 'node:test';
import assert from 'node:assert/strict';
import { duplicateReminderDraft } from '../src/utils/duplicate-reminder.ts';

test('duplicate creates an editable independent draft and excludes device and lifecycle data', () => {
  const source = { id: 42, name: 'Insurance', categoryId: 3, dateType: 'renewal', targetDate: '2027-02-01', reminderTime: '10:30', importance: 'high', repeatType: 'yearly', repeatInterval: 1, notes: 'Policy', costMinor: 29900, costCurrency: 'MYR', archived: true, createdAt: 'old', attachments: ['file'], history: ['renewed'] };
  const reminders = [{ daysBefore: 7, enabled: true, isSnooze: false, notificationId: 'device' }, {daysBefore: 7, enabled: true, isSnooze: false}, {daysBefore: 0, enabled: true, isSnooze: false}, {daysBefore: 3, enabled: false, isSnooze: false}, {daysBefore: 1, enabled: true, isSnooze: true}];
  const before = JSON.stringify({source, reminders});
  const draft = duplicateReminderDraft(source, reminders);
  assert.deepEqual(draft, {name: 'Insurance (copy)', categoryId: 3, dateType: 'renewal', targetDate: '2027-02-01', reminderTime: '10:30', importance: 'high', repeatType: 'yearly', repeatInterval: 1, notes: 'Policy', costMinor: 29900, costCurrency: 'MYR', reminderDays: [7, 0]});
  assert.equal(JSON.stringify({source, reminders}), before);
  draft.reminderDays.push(30);
  assert.equal(reminders.length, 5);
});
