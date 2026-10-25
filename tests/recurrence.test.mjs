import assert from 'node:assert/strict';
import test from 'node:test';
import './support/register-typescript.mjs';
const { nextOccurrence, nextFutureOccurrence, occurrenceOnDate } = await import('../src/utils/recurrence.ts');

test('repeat dates cross years and clamp short months and leap days', () => {
  assert.equal(nextOccurrence('2026-12-31', 'daily'), '2027-01-01');
  assert.equal(nextOccurrence('2026-12-31', 'weekly'), '2027-01-07');
  assert.equal(nextOccurrence('2027-01-31', 'monthly'), '2027-02-28');
  assert.equal(nextOccurrence('2028-02-29', 'yearly'), '2029-02-28');
  assert.equal(nextOccurrence('2026-12-31', 'custom', 14), '2027-01-14');
  for (const interval of [0, -1, 1.5, 3651]) assert.throws(() => nextOccurrence('2027-01-01', 'custom', interval));
});

test('completion skips missed dates and always advances the current occurrence', () => {
  assert.equal(nextFutureOccurrence('2026-10-01', 'weekly', 1, '2026-10-24'), '2026-10-29');
  assert.equal(nextFutureOccurrence('2026-10-24', 'daily', 1, '2026-10-24'), '2026-10-25');
});


test('calendar projects all repeat types without dates before the first occurrence', () => {
  assert.equal(occurrenceOnDate('2027-01-31', 'monthly', 1, '2027-02-28'), true);
  assert.equal(occurrenceOnDate('2027-01-31', 'monthly', 1, '2027-02-27'), false);
  assert.equal(occurrenceOnDate('2028-02-29', 'yearly', 1, '2029-02-28'), true);
  assert.equal(occurrenceOnDate('2027-01-01', 'weekly', 1, '2027-01-08'), true);
  assert.equal(occurrenceOnDate('2027-01-01', 'daily', 1, '2026-12-31'), false);
  assert.equal(occurrenceOnDate('2027-01-01', 'custom', 3, '2027-01-04'), true);
  assert.equal(occurrenceOnDate('2027-01-01', 'custom', 3, '2027-01-05'), false);
});
