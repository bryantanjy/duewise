import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import test from 'node:test';
import './support/register-typescript.mjs';
import { drizzle } from '../node_modules/drizzle-orm/expo-sqlite/driver.js';
import { createSqliteItemRepository } from './support/sqlite-item-repository.mjs';
import { expoSqliteNodeAdapter } from './support/expo-sqlite-node-adapter.mjs';
const sqlite = createSqliteItemRepository();
globalThis.__backupDb = drizzle(expoSqliteNodeAdapter(sqlite.database));
globalThis.__backupReschedule = async (id) => ({ itemId: id, scheduledReminderCount: 2, skippedReminderCount: 0 });
registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier === '@/db') return { url: 'data:text/javascript,export const db = globalThis.__backupDb;', shortCircuit: true };
  if (specifier === './items') return { url: 'data:text/javascript,export const rescheduleItem = (id) => globalThis.__backupReschedule(id);', shortCircuit: true };
  if (specifier.startsWith('@/')) return nextResolve(new URL('../src/' + specifier.slice(2) + '.ts', import.meta.url).href, context);
  return nextResolve(specifier, context);
} });
const { createBackup, previewBackup, restoreBackup } = await import('../src/services/backup.ts');
const item = {
  name: 'Passport', category: { name: 'Custom', icon: 'file-text', color: '#123456' }, dateType: 'expiry', targetDate: '2099-02-01',
  reminderTime: '18:45', repeatType: 'custom', repeatInterval: 14, importance: 'high', notes: 'Keep original', archived: false,
  createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-02T00:00:00Z', reminderDays: [7, 0],
  history: [{ action: 'renewed', previousDate: '2098-02-01', newDate: '2099-02-01', createdAt: '2026-01-01T00:00:00Z' }],
};
const backup = (items = [item]) => ({ format: 'duewise-backup', version: 1, exportedAt: '2026-10-24T00:00:00Z', items });
test.beforeEach(() => {
  sqlite.database.exec('DROP TRIGGER IF EXISTS fail_backup; DROP TRIGGER IF EXISTS fail_attachment; DELETE FROM items; DELETE FROM categories WHERE id != 1;');
  globalThis.__backupReschedule = async (id) => ({ itemId: id, scheduledReminderCount: 2, skippedReminderCount: 0 });
});
test.after(() => sqlite.close());

test('restore preserves records and history, remaps categories and only schedules active items', async () => {
  const scheduled = [];
  globalThis.__backupReschedule = async (id) => { scheduled.push(id); return { itemId: id, scheduledReminderCount: 2, skippedReminderCount: 0 }; };
  const result = await restoreBackup(backup([item, { ...item, name: 'Archived', archived: true }]));
  assert.equal(result.imported, 2);
  assert.equal(result.scheduled, 2);
  assert.equal(scheduled.length, 1);
  const rows = sqlite.database.prepare('SELECT * FROM items ORDER BY id').all();
  assert.equal(rows[0].reminder_time, '18:45');
  assert.equal(rows[0].repeat_interval, 14);
  assert.equal(rows[0].created_at, item.createdAt);
  assert.equal(rows[0].notes, 'Keep original');
  assert.equal(rows[1].archived, 1);
  assert.equal(sqlite.database.prepare('SELECT count(*) AS total FROM categories WHERE name = ?').get('Custom').total, 1);
  assert.equal(sqlite.database.prepare('SELECT count(*) AS total FROM item_history').get().total, 2);
  const again = await restoreBackup(backup([item, { ...item, name: 'Archived', archived: true }]));
  assert.equal(again.imported, 0);
  assert.equal(again.duplicates, 2);
  assert.equal(scheduled.length, 1);
});

test('export excludes device notification IDs, cleanup data, and temporary snoozes', async () => {
  await restoreBackup(backup());
  const id = sqlite.database.prepare('SELECT id FROM items').get().id;
  sqlite.database.prepare('UPDATE reminders SET notification_id = ?').run('device-secret');
  sqlite.database.prepare('INSERT INTO reminders (item_id, days_before, is_snooze, notification_id) VALUES (?, 99, 1, ?)').run(id, 'snooze-secret');
  const exported = createBackup();
  assert.deepEqual(exported.items[0].reminderDays, [7, 0]);
  assert.equal(JSON.stringify(exported).includes('device-secret'), false);
  assert.equal(JSON.stringify(exported).includes('snooze-secret'), false);
  sqlite.database.exec('DELETE FROM items;');
  await restoreBackup(exported);
  assert.equal(createBackup().items[0].history.length, 1);
});

test('version 2 backup round trip retains attachments, remaps owners and skips duplicate imports', async () => {
  const attached = { ...item, attachments: [{ name: 'receipt.pdf', mimeType: 'application/pdf', size: 5, base64: 'JVBERi0=' }] };
  await restoreBackup({ ...backup([attached]), version: 2 });
  const exported = createBackup();
  assert.equal(exported.version, 3);
  assert.deepEqual(exported.items[0].attachments, attached.attachments);
  assert.equal((await restoreBackup(exported)).imported, 0);
  sqlite.database.exec('DELETE FROM items;');
  await restoreBackup(exported);
  const row = sqlite.database.prepare('SELECT * FROM attachments').get();
  assert.equal(row.item_id, sqlite.database.prepare('SELECT id FROM items').get().id);
  assert.equal(row.base64, 'JVBERi0=');
  assert.deepEqual(createBackup().items[0].attachments, attached.attachments);
});

test('invalid attachment payload rejects the complete restore before writing any item', async () => {
  await assert.rejects(restoreBackup({ ...backup([{ ...item, attachments: [{ name: '../bad.pdf', mimeType: 'application/pdf', size: 5, base64: 'JVBERi0=' }] }]), version: 2 }));
  assert.equal(sqlite.database.prepare('SELECT count(*) AS total FROM items').get().total, 0);
});

test('attachment write failure rolls back all imported reminders and categories', async () => {
  sqlite.database.exec("CREATE TRIGGER fail_attachment BEFORE INSERT ON attachments BEGIN SELECT RAISE(ABORT, 'attachment write failed'); END");
  const attached = { ...item, name: 'With document', attachments: [{ name: 'receipt.pdf', mimeType: 'application/pdf', size: 5, base64: 'JVBERi0=' }] };
  await assert.rejects(restoreBackup({ ...backup([item, attached]), version: 2 }), error => String(error.cause).includes('attachment write failed'));
  assert.equal(sqlite.database.prepare('SELECT count(*) AS total FROM items').get().total, 0);
  assert.equal(sqlite.database.prepare('SELECT count(*) AS total FROM attachments').get().total, 0);
  assert.equal(sqlite.database.prepare("SELECT count(*) AS total FROM categories WHERE name = 'Custom'").get().total, 0);
});

test('database failure rolls back the entire import including categories and schedules nothing', async () => {
  const scheduled = [];
  globalThis.__backupReschedule = async (id) => { scheduled.push(id); };
  sqlite.database.exec("CREATE TRIGGER fail_backup BEFORE INSERT ON item_history WHEN NEW.action = 'fail' BEGIN SELECT RAISE(ABORT, 'restore failed'); END;");
  await assert.rejects(restoreBackup(backup([item, { ...item, name: 'Fails last', history: [{ ...item.history[0], action: 'fail' }] }])), (error) => { assert.match(error.cause?.message ?? '', /restore failed/); return true; });
  assert.equal(sqlite.database.prepare('SELECT count(*) AS total FROM items').get().total, 0);
  assert.equal(sqlite.database.prepare('SELECT count(*) AS total FROM categories WHERE name = ?').get('Custom').total, 0);
  assert.deepEqual(scheduled, []);
});

test('notification failure keeps imported records and reports unscheduled alerts', async () => {
  globalThis.__backupReschedule = async () => { throw new Error('No notification permission'); };
  const result = await restoreBackup(backup());
  assert.equal(result.imported, 1);
  assert.equal(result.unscheduled, 2);
  assert.equal(sqlite.database.prepare('SELECT count(*) AS total FROM items').get().total, 1);
  assert.equal(previewBackup(backup()).duplicates, 1);
});

test('cost backup round trip preserves cents and currency; legacy imports have no cost', async () => {
  await restoreBackup({ ...backup([{...item, costMinor: 2990, costCurrency: 'MYR'}]), version: 3 });
  const exported = createBackup();
  assert.equal(exported.items[0].costMinor, 2990);
  assert.equal(exported.items[0].costCurrency, 'MYR');
  assert.equal((await restoreBackup(exported)).duplicates, 1);
  sqlite.database.exec('DELETE FROM items');
  await restoreBackup(exported);
  assert.equal(createBackup().items[0].costMinor, 2990);
  sqlite.database.exec('DELETE FROM items');
  await restoreBackup(backup());
  assert.equal(createBackup().items[0].costMinor, null);
  await assert.rejects(restoreBackup({...backup([{...item, costMinor: 10}]), version: 3}));
});
