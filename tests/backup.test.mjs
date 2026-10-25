import assert from 'node:assert/strict';
import test from 'node:test';
import './support/register-typescript.mjs';
const { parseBackup, backupPreview, MAX_BACKUP_BYTES } = await import('../src/utils/backup.ts');
const item = {
  name: 'Passport', category: { name: 'Document', icon: 'file-text', color: '#123456' },
  dateType: 'expiry', targetDate: '2028-02-29', reminderTime: '18:45', repeatType: 'custom', repeatInterval: 14,
  importance: 'high', notes: 'Keep original', archived: false, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
  reminderDays: [7, 0], history: [{ action: 'renewed', previousDate: '2027-02-28', newDate: '2028-02-29', createdAt: '2026-01-01T00:00:00Z' }],
};
const backup = (items = [item]) => ({ format: 'duewise-backup', version: 1, exportedAt: '2026-10-24T00:00:00Z', items });

test('backup round trip preserves dates, time, recurrence, archive state, notes and history', () => {
  const value = parseBackup(JSON.stringify(backup([item, { ...item, name: 'Archived', archived: true, category: null }])));
  assert.equal(value.items[0].reminderTime, '18:45');
  assert.equal(value.items[0].repeatInterval, 14);
  assert.equal(value.items[0].history.length, 1);
  assert.equal(value.items[1].archived, true);
  assert.equal(value.items[1].category, null);
});

test('malformed JSON, future versions and invalid dates/times/intervals are rejected', () => {
  assert.throws(() => parseBackup('{'), /valid JSON/);
  assert.throws(() => parseBackup(JSON.stringify({ ...backup(), version: 99 })), /version/);
  for (const fields of [{ targetDate: '2027-02-29' }, { reminderTime: '24:00' }, { repeatInterval: 0 }, { reminderDays: [-1] }, { archived: 'false' }]) {
    assert.throws(() => parseBackup(JSON.stringify(backup([{ ...item, ...fields }]))), /invalid or missing/);
  }
  assert.throws(() => parseBackup(' '.repeat(MAX_BACKUP_BYTES + 1)), /10 MB/);
});

test('preview skips matching reminders and in-file duplicates without merging different records', () => {
  const parsed = parseBackup(JSON.stringify(backup([item, item, { ...item, name: 'New', archived: true }])));
  const plan = backupPreview(parsed, [item]);
  assert.equal(plan.duplicates, 2);
  assert.equal(plan.active, 0);
  assert.equal(plan.archived, 1);
  assert.equal(plan.additions[0].name, 'New');
  assert.equal(backupPreview(backup([{ ...item, updatedAt: '2026-10-24T00:00:00Z', category: { ...item.category, color: '#abcdef' } }]), [item]).duplicates, 1);
});

test('untrusted notification IDs are discarded and reminder days normalized', () => {
  const parsed = parseBackup(JSON.stringify(backup([{ ...item, id: 88, notificationId: 'foreign-id', reminderDays: [0, 7, 7] }])));
  assert.equal(parsed.items[0].notificationId, undefined);
  assert.equal(parsed.items[0].id, undefined);
  assert.deepEqual(parsed.items[0].reminderDays, [7, 0]);
});
