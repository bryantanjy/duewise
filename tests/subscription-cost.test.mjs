import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCostAmount, validateCost, recurringCosts } from '../src/utils/subscription-cost.ts';

test('amount entry preserves cents and rejects ambiguous or invalid values', () => {
  assert.equal(parseCostAmount('29.90'), 2990);
  assert.equal(parseCostAmount('0,01'), 1);
  assert.equal(parseCostAmount('0'), 0);
  assert.equal(parseCostAmount(' '), null);
  for (const amount of ['-1', '1.234', '1,000.00', '1e3', '10000000']) assert.throws(() => parseCostAmount(amount));
  assert.throws(() => validateCost(1.5, 'MYR'));
  assert.throws(() => validateCost(100, null));
  assert.throws(() => validateCost(null, 'USD'));
  assert.throws(() => validateCost(100, 'XYZ'));
});
test('recurring estimates combine schedules, keep currencies separate, exclude archived and one-time costs', () => {
  const row = { costMinor: 1000, costCurrency: 'MYR', repeatType: 'monthly', repeatInterval: 1, archived: false };
  assert.deepEqual(recurringCosts([row, {...row, repeatType: 'yearly', costMinor: 12000}, {...row, costCurrency: 'USD', costMinor: 0}, {...row, archived: true}, {...row, repeatType: 'none'}]), [
    {currency: 'MYR', count: 2, yearly: 24000, monthly: 2000},
    {currency: 'USD', count: 1, yearly: 0, monthly: 0},
  ]);
  assert.equal(recurringCosts([{...row, repeatType: 'custom', repeatInterval: 10}])[0].yearly, 36500);
});
