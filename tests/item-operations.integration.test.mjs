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

function setup(t, schedule) {
  assert.equal(typeof createItemOperations, 'function');
  const sqlite = createSqliteItemRepository();
  t.after(sqlite.close);
  const cleaned = [];
  const operations = createItemOperations({
    repository: sqlite.repository, schedule,
    cleanup: async (ids) => { cleaned.push([...ids]); },
  });
  return { ...sqlite, operations, cleaned };
}

test('create stores both selected days and reports one scheduled and one skipped', async (t) => {
  const { operations, repository } = setup(t, async ({ daysBefore }) => daysBefore === 30 ? 'created-30' : null);
  const result = await operations.createItem(input);
  assert.deepEqual(result, { itemId: 1, scheduledReminderCount: 1, skippedReminderCount: 1 });
  assert.deepEqual((await repository.getItemBundle(1)).reminders, [
    { daysBefore: 30, notificationId: 'created-30' }, { daysBefore: 0, notificationId: null },
  ]);
});

test('edit scheduling failure cleans staged ID and preserves prior committed state', async (t) => {
  let calls = 0;
  const { operations, repository, cleaned } = setup(t, async () => {
    calls += 1;
    if (calls === 4) throw new Error('scheduler unavailable');
    return ['old-30', 'old-0', 'staged-30'][calls - 1];
  });
  await operations.createItem(input);
  const before = await repository.getItemBundle(1);
  await assert.rejects(operations.updateItem(1, { ...input, name: 'Changed', targetDate: '2030-10-31' }), /scheduler unavailable/);
  assert.deepEqual(await repository.getItemBundle(1), before);
  assert.deepEqual(cleaned, [['staged-30']]);
});

test('successful edit swaps stored state and cleans old native IDs after commit', async (t) => {
  let calls = 0;
  const { operations, repository, database, cleaned } = setup(t, async () => ['old-30', 'old-0', 'new-7'][calls++]);
  await operations.createItem(input);
  const result = await operations.updateItem(1, { ...input, name: 'Changed', targetDate: '2030-10-31', reminderDays: [7] });
  assert.deepEqual(result, { itemId: 1, scheduledReminderCount: 1, skippedReminderCount: 0 });
  assert.deepEqual(await repository.getItemBundle(1), {
    item: { id: 1, name: 'Changed', archived: false, repeatType: 'yearly', targetDate: '2030-10-31' },
    reminders: [{ daysBefore: 7, notificationId: 'new-7' }],
  });
  assert.deepEqual(cleaned, [['old-30', 'old-0']]);
  assert.deepEqual(database.prepare('SELECT notification_id FROM notification_cleanup ORDER BY id').all()
    .map((row) => row.notification_id), ['old-30', 'old-0']);
});

test('renew clamps leap day, records history and preserves selected reminder days', async (t) => {
  const scheduledDates = [];
  const { operations, repository, database, cleaned } = setup(t, async ({ targetDate, daysBefore }) => {
    scheduledDates.push(targetDate);
    return `${targetDate}:${daysBefore}`;
  });
  await operations.createItem(input);
  await operations.renewItem(1);
  assert.deepEqual(await repository.getItemBundle(1), {
    item: { id: 1, name: 'Original', archived: false, repeatType: 'yearly', targetDate: '2029-02-28' },
    reminders: [{ daysBefore: 30, notificationId: '2029-02-28:30' }, { daysBefore: 0, notificationId: '2029-02-28:0' }],
  });
  assert.deepEqual(database.prepare('SELECT action, previous_date, new_date FROM item_history').all()
    .map((row) => ({ ...row })), [{ action: 'renewed', previous_date: '2028-02-29', new_date: '2029-02-28' }]);
  assert.deepEqual(scheduledDates, ['2028-02-29', '2028-02-29', '2029-02-28', '2029-02-28']);
  assert.deepEqual(cleaned, [['2028-02-29:30', '2028-02-29:0']]);
});

test('archive retains reminder days, clears native IDs, and queues old IDs', async (t) => {
  let calls = 0;
  const { operations, repository, database, cleaned } = setup(
    t,
    async () => ['old-30', 'old-0'][calls++],
  );
  const created = await operations.createItem(input);

  await operations.archiveItem(created.itemId);

  assert.deepEqual(await repository.getItemBundle(created.itemId), {
    item: {
      id: created.itemId,
      name: 'Original',
      archived: true,
      repeatType: 'yearly',
      targetDate: '2028-02-29',
    },
    reminders: [
      { daysBefore: 30, notificationId: null },
      { daysBefore: 0, notificationId: null },
    ],
  });
  assert.deepEqual(cleaned, [['old-30', 'old-0']]);
  assert.deepEqual(
    database.prepare('SELECT notification_id FROM notification_cleanup ORDER BY id').all()
      .map((row) => row.notification_id),
    ['old-30', 'old-0'],
  );
});

test('restore schedules retained reminder days and reactivates the item', async (t) => {
  let phase = 'create';
  const { operations, repository } = setup(t, async ({ daysBefore }) =>
    phase === 'create' ? `old-${daysBefore}` : `restored-${daysBefore}`,
  );
  const created = await operations.createItem(input);
  await operations.archiveItem(created.itemId);
  phase = 'restore';

  const result = await operations.restoreItem(created.itemId);

  assert.deepEqual(result, {
    itemId: created.itemId,
    scheduledReminderCount: 2,
    skippedReminderCount: 0,
  });
  assert.deepEqual((await repository.getItemBundle(created.itemId)).reminders, [
    { daysBefore: 30, notificationId: 'restored-30' },
    { daysBefore: 0, notificationId: 'restored-0' },
  ]);
  assert.equal((await repository.getItemBundle(created.itemId)).item.archived, false);
});

test('restore transaction failure cleans staged IDs and leaves the item archived', async (t) => {
  let phase = 'create';
  const base = createSqliteItemRepository();
  t.after(base.close);
  const cleaned = [];
  const operations = createItemOperations({
    repository: {
      ...base.repository,
      async commitRestore() {
        throw new Error('restore transaction failed');
      },
    },
    schedule: async ({ daysBefore }) =>
      phase === 'create' ? `old-${daysBefore}` : `restored-${daysBefore}`,
    cleanup: async (ids) => {
      cleaned.push([...ids]);
    },
  });
  const created = await operations.createItem(input);
  await operations.archiveItem(created.itemId);
  cleaned.length = 0;
  phase = 'restore';

  await assert.rejects(operations.restoreItem(created.itemId), /restore transaction failed/);

  assert.equal((await base.repository.getItemBundle(created.itemId)).item.archived, true);
  assert.deepEqual((await base.repository.getItemBundle(created.itemId)).reminders, [
    { daysBefore: 30, notificationId: null },
    { daysBefore: 0, notificationId: null },
  ]);
  assert.deepEqual(cleaned, [['restored-30', 'restored-0']]);
});

test('permanent delete cascades reminders and history and queues active IDs', async (t) => {
  let calls = 0;
  const { operations, repository, database, cleaned } = setup(
    t,
    async () => ['old-30', 'old-0'][calls++],
  );
  const created = await operations.createItem(input);
  database.prepare(`INSERT INTO item_history
    (item_id, previous_date, new_date, action, created_at) VALUES (?, ?, ?, 'renewed', ?)`)
    .run(created.itemId, '2027-02-28', '2028-02-29', new Date().toISOString());

  await operations.deleteItem(created.itemId);

  assert.equal(await repository.getItemBundle(created.itemId), undefined);
  assert.equal(database.prepare('SELECT COUNT(*) AS count FROM reminders').get().count, 0);
  assert.equal(database.prepare('SELECT COUNT(*) AS count FROM item_history').get().count, 0);
  assert.deepEqual(cleaned, [['old-30', 'old-0']]);
  assert.deepEqual(
    database.prepare('SELECT notification_id FROM notification_cleanup ORDER BY id').all()
      .map((row) => row.notification_id),
    ['old-30', 'old-0'],
  );
});
