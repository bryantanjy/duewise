import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveSnoozeDate } from '../src/utils/snooze.ts';

test('one-hour snooze is an elapsed hour across midnight', () => {
  const now = new Date(2026, 11, 31, 23, 45);
  assert.equal(resolveSnoozeDate('hour', '09:00', now).getTime() - now.getTime(), 3600000);
  assert.equal(resolveSnoozeDate('hour', '09:00', now).getFullYear(), 2027);
});

test('tomorrow and next week use calendar days and the reminder time', () => {
  const now = new Date(2026, 11, 31, 23, 45);
  const tomorrow = resolveSnoozeDate('tomorrow', '08:15', now);
  assert.equal(tomorrow.getFullYear(), 2027);
  assert.equal(tomorrow.getMonth(), 0);
  assert.equal(tomorrow.getDate(), 1);
  assert.equal(tomorrow.getHours(), 8);
  assert.equal(tomorrow.getMinutes(), 15);
  const week = resolveSnoozeDate('week', '18:30', now);
  assert.equal(week.getDate(), 7);
  assert.equal(week.getHours(), 18);
  assert.equal(week.getMinutes(), 30);
});

test('custom snooze copies the date and rejects invalid or elapsed times', () => {
  const now = new Date(2026, 10, 10, 10);
  const custom = new Date(2026, 10, 12, 11, 30);
  const result = resolveSnoozeDate(custom, '09:00', now);
  assert.equal(result.getTime(), custom.getTime());
  result.setFullYear(2030);
  assert.equal(custom.getFullYear(), 2026);
  for (const invalid of [new Date(NaN), now, new Date(now.getTime() - 1)]) {
    assert.throws(() => resolveSnoozeDate(invalid, '09:00', now), /future/);
  }
  assert.throws(() => resolveSnoozeDate('tomorrow', '25:00', now), /valid reminder time/);
});
