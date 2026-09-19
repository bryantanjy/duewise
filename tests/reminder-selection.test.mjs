import assert from 'node:assert/strict';
import test from 'node:test';

import {
  DEFAULT_REMINDER_DAYS,
  resolveReminderSelection,
  toggleReminderDay,
} from '../src/utils/reminder-selection.ts';

test('reminder presets can be selected and deselected independently', () => {
  assert.deepEqual(toggleReminderDay(DEFAULT_REMINDER_DAYS, 14), [30, 14, 7, 1, 0]);
  assert.deepEqual(toggleReminderDay(DEFAULT_REMINDER_DAYS, 7), [30, 1, 0]);
  assert.deepEqual(toggleReminderDay([0], 0), []);
});

test('custom reminder days are preserved without duplicates', () => {
  assert.deepEqual(resolveReminderSelection([30, 7, 0], '45'), { values: [45, 30, 7, 0] });
  assert.deepEqual(resolveReminderSelection([30, 7, 0], '7'), { values: [30, 7, 0] });
  assert.deepEqual(resolveReminderSelection([45, 7], ''), { values: [45, 7] });
});

test('custom reminder day input rejects invalid and excessive values', () => {
  assert.deepEqual(resolveReminderSelection([7], 'tomorrow'), {
    error: 'Enter a whole number of days.',
  });
  assert.deepEqual(resolveReminderSelection([7], '3651'), {
    error: 'Choose a day from 0 to 3650.',
  });
});
