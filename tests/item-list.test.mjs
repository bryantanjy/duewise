import assert from 'node:assert/strict';
import test from 'node:test';
import { selectItems, DEFAULT_ITEM_FILTERS } from '../src/utils/item-list.ts';
const base = { categoryId: 1, categoryName: 'Document', importance: 'normal', repeatType: 'none', targetDate: '2026-12-31', reminderTime: '09:00', notes: null, createdAt: '2026-01-01T00:00:00Z' };
const items = [
  { ...base, id: 1, name: 'Passport', notes: 'Renew for Jane', targetDate: '2026-12-30', importance: 'high' },
  { ...base, id: 2, name: 'Cafe subscription', categoryId: 2, categoryName: 'Subscription', repeatType: 'monthly', reminderTime: '18:00' },
  { ...base, id: 3, name: 'Policy 10', categoryId: 3, categoryName: 'Vehicle', targetDate: '2027-01-30', importance: 'low' },
  { ...base, id: 4, name: 'Policy 2', categoryId: 3, categoryName: 'Vehicle', targetDate: '2027-01-31', createdAt: '2026-12-01T00:00:00Z' },
  { ...base, id: 5, name: 'Morning medicine', categoryId: null, categoryName: null, reminderTime: '07:00', importance: 'high' },
];
const ids = (options = {}, data = items, today = '2026-12-31') => selectItems(data, { ...DEFAULT_ITEM_FILTERS, ...options }, today).map((item) => item.id);

test('search combines words across names, notes and categories, ignoring case and surrounding whitespace', () => {
  assert.deepEqual(ids({ query: '  JANE document ' }), [1]);
  assert.deepEqual(ids({ query: 'vehicle policy' }), [3, 4]);
  assert.deepEqual(ids({ query: 'nonexistent' }), []);
  assert.deepEqual(ids({ query: '   ' }), ids());
});

test('search normalizes accents and tolerates uncategorized records without notes', () => {
  const accented = [{ ...items[1], name: 'Caf' + String.fromCharCode(233) }];
  assert.deepEqual(ids({ query: 'CAFE' }, accented), [2]);
  assert.deepEqual(ids({ query: 'medicine' }), [5]);
});

test('date filters distinguish overdue, today and the inclusive 30-day boundary across years', () => {
  assert.deepEqual(ids({ status: 'overdue' }), [1]);
  assert.deepEqual(ids({ status: 'today' }), [5, 2]);
  assert.deepEqual(ids({ status: 'next30' }), [5, 2, 3]);
  assert.deepEqual(ids({ status: 'upcoming' }), [5, 2, 3, 4]);
  assert.deepEqual(ids({ status: 'overdue' }, items, '2027-01-01'), [1, 5, 2]);
});

test('category, priority, repeat, date and search filters compose', () => {
  assert.deepEqual(ids({ category: 2, repeat: 'repeating', priority: 'normal', status: 'today', query: 'subscription' }), [2]);
  assert.deepEqual(ids({ category: 2, repeat: 'none' }), []);
  assert.deepEqual(ids({ priority: 'high', repeat: 'none' }), [1, 5]);
});

test('date sorting includes reminder time and supports reversing date order', () => {
  assert.deepEqual(ids(), [1, 5, 2, 3, 4]);
  assert.deepEqual(ids({ sort: 'latest' }), [4, 3, 2, 5, 1]);
});

test('priority, natural name and newest sorting preserve deterministic ties', () => {
  assert.deepEqual(ids({ sort: 'priority' }), [1, 5, 2, 4, 3]);
  assert.deepEqual(ids({ sort: 'name', query: 'policy' }), [4, 3]);
  assert.equal(ids({ sort: 'newest' })[0], 4);
  const tied = [{ ...base, name: 'Same', id: 9 }, { ...base, name: 'Same', id: 6 }];
  assert.deepEqual(ids({}, tied), [6, 9]);
});

test('filtering never mutates live query results and defaults restore the full list', () => {
  const source = items.map((item) => ({ ...item }));
  const before = JSON.stringify(source);
  ids({ sort: 'name', priority: 'high' }, source);
  assert.equal(JSON.stringify(source), before);
  assert.equal(ids({}, source).length, source.length);
});
