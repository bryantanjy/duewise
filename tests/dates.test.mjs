import assert from 'node:assert/strict';
import test from 'node:test';
import { nextYearDate } from '../src/utils/dates.ts';

test('yearly renewal preserves month and clamps leap day', () => {
  assert.equal(nextYearDate('2028-02-29'), '2029-02-28');
  assert.equal(nextYearDate('2027-10-31'), '2028-10-31');
});
