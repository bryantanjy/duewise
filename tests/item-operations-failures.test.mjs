import assert from 'node:assert/strict';
import test from 'node:test';
import './support/register-typescript.mjs';
import { createSqliteItemRepository } from './support/sqlite-item-repository.mjs';

let createItemOperations;
try {
  ({ createItemOperations } = await import('../src/services/item-operations.ts'));
} catch (error) {
  if (error.code !== 'ERR_MODULE_NOT_FOUND') throw error;
}

const input = {
  categoryId: 1, dateType: 'due', importance: 'normal', name: 'Original',
  reminderDays: [30, 0], repeatType: 'yearly', targetDate: '2028-02-29',
};

function setup(t, overrides = {}) {
  assert.equal(typeof createItemOperations, 'function');
  const sqlite = createSqliteItemRepository();
  t.after(sqlite.close);
  const cleaned = [];
  const operations = createItemOperations({
    repository: sqlite.repository, schedule: async ({ daysBefore }) => `new-${daysBefore}`,
    cleanup: async (ids) => { cleaned.push([...ids]); }, ...overrides,
  });
  return { ...sqlite, operations, cleaned };
}

test('failed create reminder transaction compensates all IDs and removes provisional item', async (t) => {
  const { database, operations, cleaned } = setup(t);
  database.exec(`CREATE TRIGGER fail_reminder BEFORE INSERT ON reminders WHEN NEW.days_before = 0
    BEGIN SELECT RAISE(ABORT, 'reminder write failed'); END`);
  await assert.rejects(operations.createItem(input), /reminder write failed/);
  assert.deepEqual(cleaned, [['new-30', 'new-0']]);
  assert.equal(database.prepare('SELECT COUNT(*) AS count FROM items').get().count, 0);
  assert.equal(database.prepare('SELECT COUNT(*) AS count FROM reminders').get().count, 0);
});

test('failed create scheduling cleans partial IDs before deleting provisional item', async (t) => {
  let calls = 0;
  const sqlite = createSqliteItemRepository();
  t.after(sqlite.close);
  const events = [];
  assert.equal(typeof createItemOperations, 'function');
  const operations = createItemOperations({
    repository: { ...sqlite.repository, async deleteProvisionalItem(id) {
      events.push('delete');
      await sqlite.repository.deleteProvisionalItem(id);
    } },
    schedule: async () => { if (calls++ === 0) return 'partial'; throw new Error('schedule failed'); },
    cleanup: async (ids) => { events.push(['cleanup', ...ids]); },
  });
  await assert.rejects(operations.createItem(input), /schedule failed/);
  assert.deepEqual(events, [['cleanup', 'partial'], 'delete']);
  assert.equal(await sqlite.repository.getItemBundle(1), undefined);
});

test('compensation failures remain attached without masking the original transaction error', async (t) => {
  const sqlite = createSqliteItemRepository();
  t.after(sqlite.close);
  const original = new Error('commit failed');
  const cleanupError = new Error('enqueue failed');
  const deleteError = new Error('delete failed');
  const events = [];
  assert.equal(typeof createItemOperations, 'function');
  const operations = createItemOperations({
    repository: { ...sqlite.repository,
      async commitCreatedReminders() { throw original; },
      async deleteProvisionalItem() { events.push('delete'); throw deleteError; },
    },
    schedule: async () => 'staged',
    cleanup: async () => { events.push('cleanup'); throw cleanupError; },
  });
  await assert.rejects(operations.createItem({ ...input, reminderDays: [0] }), (error) => {
    assert.equal(error, original);
    assert.deepEqual(error.compensationErrors, [cleanupError, deleteError]);
    assert.equal(Object.getOwnPropertyDescriptor(error, 'compensationErrors').enumerable, false);
    return true;
  });
  assert.deepEqual(events, ['cleanup', 'delete']);
});

for (const operation of ['updateItem', 'renewItem']) {
  test(`${operation} transaction rollback preserves old item, reminders, history and cleanup queue`, async (t) => {
    const { database, repository, operations, cleaned } = setup(t);
    const itemId = await repository.createItemRecord(input);
    await repository.commitCreatedReminders(itemId, [{ daysBefore: 30, notificationId: 'old-30' }, { daysBefore: 0, notificationId: 'old-0' }]);
    const before = await repository.getItemBundle(itemId);
    database.exec(`CREATE TRIGGER fail_cleanup BEFORE INSERT ON notification_cleanup
      BEGIN SELECT RAISE(ABORT, 'cleanup queue write failed'); END`);
    await assert.rejects(operations[operation](itemId, { ...input, name: 'Changed' }), /cleanup queue write failed/);
    assert.deepEqual(await repository.getItemBundle(itemId), before);
    assert.deepEqual(cleaned, [['new-30', 'new-0']]);
    assert.equal(database.prepare('SELECT COUNT(*) AS count FROM item_history').get().count, 0);
    assert.equal(database.prepare('SELECT COUNT(*) AS count FROM notification_cleanup').get().count, 0);
  });
}

test('missing edit and renew fail before scheduling', async (t) => {
  let scheduled = 0;
  const { operations } = setup(t, { schedule: async () => { scheduled += 1; return null; } });
  await assert.rejects(operations.updateItem(99, input), /Item not found\./);
  await assert.rejects(operations.renewItem(99), /Item not found\./);
  assert.equal(scheduled, 0);
});

test('non-yearly and archived yearly items cannot renew or schedule reminders', async (t) => {
  let scheduled = 0;
  const { repository, operations } = setup(t, { schedule: async () => { scheduled += 1; return null; } });
  const nonYearly = await repository.createItemRecord({ ...input, repeatType: 'none' });
  const archived = await repository.createItemRecord(input);
  await repository.commitArchive({ itemId: archived, oldNotificationIds: [] });
  await assert.rejects(operations.renewItem(nonYearly), /Only active yearly items can be renewed\./);
  await assert.rejects(operations.renewItem(archived), /Only active yearly items can be renewed\./);
  assert.equal(scheduled, 0);
});

test('post-commit cleanup failure never compensates valid replacement reminders', async (t) => {
  const cleaned = [];
  const { repository, operations } = setup(t, { cleanup: async (ids) => {
    cleaned.push([...ids]); throw new Error('cleanup storage unavailable');
  } });
  const itemId = await repository.createItemRecord(input);
  await repository.commitCreatedReminders(itemId, [{ daysBefore: 0, notificationId: 'old' }]);
  await assert.rejects(operations.updateItem(itemId, { ...input, name: 'Changed', reminderDays: [0] }), /cleanup storage unavailable/);
  assert.equal((await repository.getItemBundle(itemId)).item.name, 'Changed');
  assert.deepEqual((await repository.getItemBundle(itemId)).reminders, [{ daysBefore: 0, notificationId: 'new-0' }]);
  assert.deepEqual(cleaned, [['old']]);
});
