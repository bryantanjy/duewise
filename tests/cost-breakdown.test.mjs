import test from 'node:test';
import assert from 'node:assert/strict';
import './support/register-typescript.mjs';
const { costBreakdown } = await import('../src/utils/cost-breakdown.ts');
const row = { id: 1, name: 'Plan', targetDate: '2027-01-01', costMinor: 2990, costCurrency: 'MYR', repeatType: 'monthly', repeatInterval: 1, archived: false };
test('cost breakdown includes zero and one-time costs, sorts by due date, and excludes archived or missing costs', () => {
  const input = [row, {...row, id: 2, archived: true}, {...row, id: 3, costMinor: null}, {...row, id: 4, targetDate: '2026-12-01', costMinor: 0, repeatType: 'none'}];
  const result = costBreakdown(input);
  assert.deepEqual(result.rows.map(item => item.id), [4, 1]);
  assert.equal(result.totals[0].monthly, 2990);
  assert.equal(input[0].id, 1);
});
test('currency selection changes rows and totals without converting currencies; stale selection resets', () => {
  const input = [row, {...row, id: 2, costCurrency: 'USD', costMinor: 1000}];
  const result = costBreakdown(input, 'USD');
  assert.deepEqual(result.currencies, ['MYR', 'USD']);
  assert.deepEqual(result.rows.map(item => item.id), [2]);
  assert.equal(result.totals[0].yearly, 12000);
  assert.equal(costBreakdown([row], 'USD').selected, undefined);
  assert.deepEqual(costBreakdown([]).rows, []);
});
