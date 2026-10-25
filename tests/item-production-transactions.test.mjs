import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import test from 'node:test';
import './support/register-typescript.mjs';
import { drizzle } from '../node_modules/drizzle-orm/expo-sqlite/driver.js';
import { createSqliteItemRepository } from './support/sqlite-item-repository.mjs';
import { expoSqliteNodeAdapter } from './support/expo-sqlite-node-adapter.mjs';

const sqlite = createSqliteItemRepository();
const adapter = expoSqliteNodeAdapter(sqlite.database);
globalThis.__itemTestDb = drizzle(adapter);
globalThis.__itemTestSchedule = async ({ daysBefore }) => `new-${daysBefore}`;
globalThis.__itemTestCancel = async () => {};

registerHooks({
  resolve(specifier, context, nextResolve) {
    const stubs = {
      expo: 'export const isRunningInExpoGo = () => false;',
      'react-native': "export const Platform = { OS: 'ios' };",
      '@/db': 'export const db = globalThis.__itemTestDb;',
      './notifications': `
        export const scheduleItemReminder = (...args) => globalThis.__itemTestSchedule(...args);
        export const scheduleSnoozedReminder = async (input) => 'duewise_snooze_' + input.requestId;
        export const deviceNotificationAdapter = {
          schedule: scheduleItemReminder,
          cancel: (...args) => globalThis.__itemTestCancel(...args),
        };
      `,
    };
    if (specifier in stubs) {
      return { url: `data:text/javascript,${encodeURIComponent(stubs[specifier])}`, shortCircuit: true };
    }
    if (specifier.startsWith('@/')) {
      return nextResolve(new URL(`../src/${specifier.slice(2)}.ts`, import.meta.url).href, context);
    }
    return nextResolve(specifier, context);
  },
});
const service = await import('../src/services/items.ts');
const input = {
  categoryId: 1, dateType: 'due', importance: 'normal', name: 'Original',
  reminderDays: [30, 0], repeatType: 'yearly', targetDate: '2028-02-29',
};

test.after(() => sqlite.close());
test.beforeEach(() => {
  sqlite.database.exec(`DROP TRIGGER IF EXISTS fail_reminder;
    DELETE FROM items; DELETE FROM notification_cleanup; DELETE FROM sqlite_sequence WHERE name = 'items';`);
  globalThis.__itemTestSchedule = async ({ daysBefore }) => `new-${daysBefore}`;
  globalThis.__itemTestCancel = async () => {};
});

test('production edit rolls back fields and rows when a staged reminder insert fails', async () => {
  const itemId = await sqlite.repository.createItemRecord(input);
  await sqlite.repository.commitCreatedReminders(itemId, [{ daysBefore: 0, notificationId: 'old' }]);
  const before = await sqlite.repository.getItemBundle(itemId);
  sqlite.database.exec(`CREATE TRIGGER fail_reminder BEFORE INSERT ON reminders WHEN NEW.days_before = 0
    BEGIN SELECT RAISE(ABORT, 'insert failed'); END`);
  const cancelled = [];
  globalThis.__itemTestCancel = async (id) => { cancelled.push(id); };
  await assert.rejects(service.updateItem(itemId, { ...input, name: 'Changed' }));
  assert.deepEqual(await sqlite.repository.getItemBundle(itemId), before);
  assert.deepEqual(cancelled.sort(), ['new-0', 'new-30']);
});

test('production renew atomically records leap-day history and defers failed native cleanup', async () => {
  const itemId = await sqlite.repository.createItemRecord(input);
  await sqlite.repository.commitCreatedReminders(itemId, [{ daysBefore: 0, notificationId: 'old' }]);
  globalThis.__itemTestCancel = async () => { throw new Error('device unavailable'); };
  const result = await service.renewItem(itemId);
  assert.deepEqual(result, { itemId, scheduledReminderCount: 1, skippedReminderCount: 0 });
  assert.equal((await sqlite.repository.getItemBundle(itemId)).item.targetDate, '2029-02-28');
  assert.deepEqual(sqlite.database.prepare('SELECT action, previous_date, new_date FROM item_history').all()
    .map((row) => ({ ...row })), [{ action: 'renewed', previous_date: '2028-02-29', new_date: '2029-02-28' }]);
  assert.deepEqual(sqlite.database.prepare('SELECT notification_id, attempts, last_error FROM notification_cleanup').all()
    .map((row) => ({ ...row })), [{ notification_id: 'old', attempts: 1, last_error: 'device unavailable' }]);
});

test('production create reports compensation storage failure while preserving staging failure', async (t) => {
  let calls = 0;
  globalThis.__itemTestSchedule = async () => {
    if (calls++ === 0) return 'partial';
    throw new Error('schedule failed');
  };
  sqlite.database.exec(`CREATE TRIGGER fail_reminder BEFORE INSERT ON notification_cleanup
    BEGIN SELECT RAISE(ABORT, 'enqueue failed'); END`);
  const logged = [];
  t.mock.method(console, 'error', (...args) => { logged.push(args); });
  await assert.rejects(service.createItem(input), (error) => {
    assert.equal(error.message, 'schedule failed');
    assert.equal(error.compensationErrors.length, 1);
    return true;
  });
  assert.equal(await sqlite.repository.getItemBundle(1), undefined);
  assert.equal(logged.length, 1);
});


test('selected time persists through create, edit, renew and restore scheduling', async () => {
  const scheduled = [];
  globalThis.__itemTestSchedule = async (value) => {
    scheduled.push(value);
    return `time-${scheduled.length}`;
  };
  const { itemId } = await service.createItem({ ...input, reminderTime: '18:45' });
  assert.equal(sqlite.database.prepare('SELECT reminder_time FROM items WHERE id = ?').get(itemId).reminder_time, '18:45');
  await service.updateItem(itemId, { ...input, reminderTime: '07:15' });
  await service.renewItem(itemId);
  await service.archiveItem(itemId);
  await service.restoreItem(itemId);
  assert.deepEqual(scheduled.map((row) => row.reminderTime), ['18:45', '18:45', '07:15', '07:15', '07:15', '07:15', '07:15', '07:15']);
  assert.equal(sqlite.database.prepare('SELECT reminder_time FROM items WHERE id = ?').get(itemId).reminder_time, '07:15');
});


test('complete advances repeating items once and stale notification actions cannot advance again', async () => {
  const { itemId } = await service.createItem({ ...input, repeatType: 'custom', repeatInterval: 14, targetDate: '2028-01-01', reminderTime: '18:45' });
  await service.completeItem(itemId, '2028-01-01');
  assert.equal(sqlite.database.prepare('SELECT target_date FROM items WHERE id = ?').get(itemId).target_date, '2028-01-15');
  await service.completeItem(itemId, '2028-01-01');
  assert.equal(sqlite.database.prepare('SELECT target_date FROM items WHERE id = ?').get(itemId).target_date, '2028-01-15');
});

test('snoozes are tracked, deduplicated and cancelled on completion without becoming repeat rules', async () => {
  const cancelled = [];
  globalThis.__itemTestCancel = async (id) => cancelled.push(id);
  const { itemId } = await service.createItem({ ...input, repeatType: 'daily', reminderDays: [7], targetDate: '2028-01-01' });
  await service.snoozeItem(itemId, '2028-01-01', 'request-one');
  await service.snoozeItem(itemId, '2028-01-01', 'request-one');
  assert.equal(sqlite.database.prepare('SELECT count(*) AS total FROM reminders WHERE is_snooze = 1').get().total, 1);
  await service.completeItem(itemId, '2028-01-01');
  assert.ok(cancelled.includes('duewise_snooze_request-one'));
  assert.deepEqual(sqlite.database.prepare('SELECT days_before FROM reminders WHERE item_id = ?').all(itemId).map((row) => row.days_before), [7]);
  await service.snoozeItem(itemId, '2028-01-01', 'stale');
  assert.equal(sqlite.database.prepare('SELECT count(*) AS total FROM reminders WHERE is_snooze = 1').get().total, 0);
});

test('completing one-time items archives them and cancels outstanding alerts', async () => {
  const cancelled = [];
  globalThis.__itemTestCancel = async (id) => cancelled.push(id);
  const { itemId } = await service.createItem({ ...input, repeatType: 'none' });
  await service.completeItem(itemId, input.targetDate);
  assert.equal(sqlite.database.prepare('SELECT archived FROM items WHERE id = ?').get(itemId).archived, 1);
  assert.equal(cancelled.length, 2);
});


test('simultaneous completion actions advance an occurrence only once', async () => {
  const { itemId } = await service.createItem({ ...input, repeatType: 'daily', targetDate: '2028-01-01' });
  await Promise.all([service.completeItem(itemId, '2028-01-01'), service.completeItem(itemId, '2028-01-01')]);
  assert.equal(sqlite.database.prepare('SELECT target_date FROM items WHERE id = ?').get(itemId).target_date, '2028-01-02');
});


test('rescheduling restored items preserves metadata and compensates failed native alerts', async () => {
  const { itemId } = await service.createItem({ ...input, reminderTime: '18:45' });
  const before = sqlite.database.prepare('SELECT * FROM items WHERE id = ?').get(itemId);
  await service.rescheduleItem(itemId);
  assert.deepEqual(sqlite.database.prepare('SELECT * FROM items WHERE id = ?').get(itemId), before);
  const cancelled = [];
  globalThis.__itemTestCancel = async (id) => cancelled.push(id);
  globalThis.__itemTestSchedule = async ({ daysBefore }) => {
    if (daysBefore === 0) throw new Error('OS scheduling failed');
    return 'staged-backup-alert';
  };
  await assert.rejects(service.rescheduleItem(itemId), /OS scheduling failed/);
  assert.ok(cancelled.includes('staged-backup-alert'));
  assert.deepEqual(sqlite.database.prepare('SELECT * FROM items WHERE id = ?').get(itemId), before);
});
