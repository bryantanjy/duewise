import { eq } from 'drizzle-orm';
import { randomUUID } from 'expo-crypto';
import { db } from '@/db';
import { attachments, categories, cloudState, itemHistory, items, notificationCleanup, reminders } from '@/db/schema';
import { snapshot, insertItem } from './backup';
import { cloudRecordsSchema, type CloudRecords } from '@/utils/cloud-merge';
import { backupItemKey, type BackupItem } from '@/utils/backup';
import { MAX_TOTAL_ATTACHMENT_BYTES } from '@/utils/attachments';

export function readCloudSetting(key: string) { return db.select().from(cloudState).where(eq(cloudState.key, key)).get()?.value; }
export function writeCloudSetting(key: string, value: string) { db.insert(cloudState).values({ key, value }).onConflictDoUpdate({ target: cloudState.key, set: { value } }).run(); }
export function cloudLocalRecords(remote: CloudRecords = {}): CloudRecords {
  return db.transaction(tx => {
    const values = snapshot(tx).items;
    const rows = tx.select().from(items).orderBy(items.id).all();
    const records: CloudRecords = {};
    const claimed = new Set(rows.map(row => row.syncId).filter(Boolean));
    rows.forEach((row, index) => {
      const matching = !row.syncId ? Object.entries(remote).find(([id, item]) => !claimed.has(id) && backupItemKey(item) === backupItemKey(values[index]))?.[0] : undefined;
      const id = row.syncId ?? matching ?? randomUUID();
      if (!row.syncId) tx.update(items).set({ syncId: id }).where(eq(items.id, row.id)).run();
      claimed.add(id);
      records[id] = values[index];
    });
    return records;
  });
}
export function cloudBaseline(): CloudRecords {
  const stored = readCloudSetting('baseline');
  return stored ? cloudRecordsSchema.parse(JSON.parse(stored)) : {};
}
export function cloudConflictId(source: string, item: BackupItem) {
  const key = `conflict.${source}`;
  const fingerprint = backupItemKey(item);
  const value = readCloudSetting(key);
  const stored = value ? JSON.parse(value) as { fingerprint: string; id: string } : undefined;
  if (stored?.fingerprint === fingerprint) return stored.id;
  const id = randomUUID();
  writeCloudSetting(key, JSON.stringify({ fingerprint, id }));
  return id;
}
export function validateCloudCapacity(records: CloudRecords) {
  cloudRecordsSchema.parse(records);
  const bytes = Object.values(records).reduce((sum, item) => sum + (item.attachments ?? []).reduce((n, entry) => n + entry.size, 0), 0);
  if (bytes > MAX_TOTAL_ATTACHMENT_BYTES) throw new Error('The merged attachments exceed the 25 MB limit. Remove unused attachments before syncing.');
  if (new TextEncoder().encode(JSON.stringify(records)).length > 50 * 1024 * 1024) throw new Error('Cloud data exceeds the 50 MB sync limit.');
}
export function applyCloudRecords(records: CloudRecords, revision = 0) {
  validateCloudCapacity(records);
  return db.transaction(tx => {
    const rows = tx.select().from(items).orderBy(items.id).all();
    const before = snapshot(tx).items;
    const categoryIds = new Map(tx.select().from(categories).all().map(row => [row.name, row.id]));
    const changed: number[] = [];
    const seen = new Set<string>();
    const cancelAlerts = (id: number) => {
      for (const row of tx.select().from(reminders).where(eq(reminders.itemId, id)).all()) {
        if (row.notificationId) tx.insert(notificationCleanup).values({ notificationId: row.notificationId }).onConflictDoNothing().run();
      }
    };
    rows.forEach((row, index) => {
      if (!row.syncId) throw new Error('Local reminder changed during sync. Try again.');
      seen.add(row.syncId);
      const value = records[row.syncId];
      if (value && backupItemKey(value) === backupItemKey(before[index])) return;
      cancelAlerts(row.id);
      if (!value) { tx.delete(items).where(eq(items.id, row.id)).run(); return; }
      // Reuse the portable insert path, then keep the original local ID for navigation.
      const tempId = insertItem(tx, value, categoryIds);
      const temp = tx.select().from(items).where(eq(items.id, tempId)).get()!;
      const { id: _id, syncId: _syncId, ...fields } = temp;
      tx.update(items).set(fields).where(eq(items.id, row.id)).run();
      for (const table of [reminders, attachments, itemHistory]) {
        tx.delete(table).where(eq(table.itemId, row.id)).run();
        tx.update(table).set({ itemId: row.id }).where(eq(table.itemId, tempId)).run();
      }
      tx.delete(items).where(eq(items.id, tempId)).run();
      if (!value.archived) changed.push(row.id);
    });
    for (const [syncId, value] of Object.entries(records)) {
      if (seen.has(syncId)) continue;
      const id = insertItem(tx, value, categoryIds);
      tx.update(items).set({ syncId }).where(eq(items.id, id)).run();
      if (!value.archived) changed.push(id);
    }
    const save = (key: string, value: string) => tx.insert(cloudState).values({ key, value }).onConflictDoUpdate({ target: cloudState.key, set: { value } }).run();
    const pending = JSON.parse(readCloudSetting('pendingAlerts') ?? '[]') as number[];
    save('pendingAlerts', JSON.stringify([...new Set([...pending, ...changed])]));
    save('revision', String(revision));
    save('baseline', JSON.stringify(records));
    save('lastSync', new Date().toISOString());
    return changed;
  });
}
