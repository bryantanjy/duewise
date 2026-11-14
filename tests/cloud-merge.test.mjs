import test from 'node:test';
import assert from 'node:assert/strict';
import './support/register-typescript.mjs';
const { mergeCloudRecords, cloudRecordsSchema, sameCloudRecords } = await import('../src/utils/cloud-merge.ts');
const id = '11111111-1111-4111-8111-111111111111', copy = '22222222-2222-4222-8222-222222222222';
const item = { name: 'Plan', category: null, dateType: 'renewal', targetDate: '2099-01-01', reminderTime: '09:00', repeatType: 'monthly', repeatInterval: 1, importance: 'normal', notes: null, archived: false, costMinor: 2990, costCurrency: 'MYR', attachments: [], createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z', reminderDays: [3,0], history: [] };
const merge = (base, local, remote) => mergeCloudRecords(base, local, remote, () => copy);
test('first sync combines devices; unchanged local follows remote update or deletion', () => {
  assert.deepEqual(merge({}, {}, {[id]:item}).records, {[id]:item});
  assert.deepEqual(merge({}, {[id]:item}, {}).records, {[id]:item});
  assert.deepEqual(merge({[id]:item}, {[id]:item}, {}).records, {});
  const edited = {...item, notes: 'Remote change'};
  assert.deepEqual(merge({[id]:item}, {[id]:item}, {[id]:edited}).records, {[id]:edited});
});
test('offline edits upload; deletes propagate without resurrecting unchanged records', () => {
  const edited = {...item, name: 'Local change'};
  assert.deepEqual(merge({[id]:item}, {[id]:edited}, {[id]:item}).records, {[id]:edited});
  assert.deepEqual(merge({[id]:item}, {}, {[id]:item}).records, {});
});
test('concurrent edits retain both versions; a changed item survives concurrent deletion', () => {
  const local = {...item, notes:'Local'}, remote = {...item, costMinor: 5000};
  const result = merge({[id]:item}, {[id]:local}, {[id]:remote});
  assert.equal(result.conflicts, 1);
  assert.deepEqual(result.records[id], remote);
  assert.equal(result.records[copy].notes, 'Local');
  assert.match(result.records[copy].name, /conflict copy/);
  assert.deepEqual(merge({[id]:item}, {}, {[id]:remote}).records, {[id]:remote});
  assert.deepEqual(merge({[id]:item}, {[id]:local}, {}).records, {[id]:local});
});
test('identical edits avoid conflicts; malformed cloud payload fails validation', () => {
  const edited = {...item, costMinor: 0};
  assert.equal(merge({[id]:item}, {[id]:edited}, {[id]:edited}).conflicts, 0);
  assert.equal(cloudRecordsSchema.safeParse({[id]: item}).success, true);
  assert.equal(cloudRecordsSchema.safeParse({bad: item}).success, false);
  assert.equal(cloudRecordsSchema.safeParse({[id]: {...item, costMinor:-1}}).success, false);
});
test('retrying a conflict with the same copy identity does not add duplicate conflict copies', () => {
  const local = {...item, notes:'Local'}, remote = {...item, notes:'Remote'};
  const first = merge({[id]:item}, {[id]:local}, {[id]:remote});
  const retry = merge({[id]:item}, {[id]:local}, first.records);
  assert.equal(Object.keys(retry.records).length, 2);
});

test('Postgres JSON key ordering does not trigger redundant uploads', () => {
  assert.equal(sameCloudRecords({[id]:item,[copy]:item},{[copy]:item,[id]:item}),true);
});
