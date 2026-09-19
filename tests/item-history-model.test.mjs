import assert from 'node:assert/strict';
import test from 'node:test';
import './support/register-typescript.mjs';

const { buildRenewalHistoryModel } = await import('../src/utils/item-history-model.ts');

test('renewal history exposes readable previous and new dates', () => {
  assert.deepEqual(
    buildRenewalHistoryModel({
      action: 'renewed',
      createdAt: '2026-09-18T01:30:00.000Z',
      id: 3,
      newDate: '2027-10-31',
      previousDate: '2026-10-31',
    }, 'en-GB', 'Asia/Kuala_Lumpur'),
    {
      id: 3,
      changedAt: '18 September 2026, 09:30',
      newDate: '31 October 2027',
      previousDate: '31 October 2026',
    },
  );
});

test('history ignores non-renewal and malformed rows', () => {
  assert.equal(buildRenewalHistoryModel({
    action: 'created',
    createdAt: '2026-09-18T01:30:00.000Z',
    id: 1,
    newDate: null,
    previousDate: null,
  }), undefined);
});
