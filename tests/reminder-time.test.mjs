import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import assert from 'node:assert/strict';
import test from 'node:test';
import { reminderDateFor, toStoredTime } from '../src/utils/reminder-time.ts';

test('selected reminder time survives day offsets across month and year boundaries', () => {
  const date = reminderDateFor('2027-01-01', 1, '18:45');
  assert.equal(date.getFullYear(), 2026);
  assert.equal(date.getMonth(), 11);
  assert.equal(date.getDate(), 31);
  assert.equal(toStoredTime(date), '18:45');
  assert.equal(date.getSeconds(), 0);
});

test('same-day reminders use selected time and legacy reminders default to 09:00', () => {
  assert.equal(toStoredTime(reminderDateFor('2027-02-01', 0, '00:05')), '00:05');
  assert.equal(toStoredTime(reminderDateFor('2027-02-01', 0)), '09:00');
  for (const invalid of ['24:00', '12:60', '', '9:00']) {
    assert.throws(() => reminderDateFor('2027-02-01', 0, invalid));
  }
});


test('migration preserves existing items and gives them the legacy reminder time', () => {
  const database = new DatabaseSync(':memory:');
  try {
    database.exec("CREATE TABLE items (id INTEGER PRIMARY KEY, name TEXT); INSERT INTO items VALUES (1, 'Existing');");
    database.exec(readFileSync(new URL('../drizzle/20261024110952_slow_darkhawk/migration.sql', import.meta.url), 'utf8'));
    const row = database.prepare('SELECT * FROM items').get();
    assert.equal(row.name, 'Existing');
    assert.equal(row.reminder_time, '09:00');
  } finally {
    database.close();
  }
});
