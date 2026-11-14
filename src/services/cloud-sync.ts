import { db } from '@/db';
import { items } from '@/db/schema';
import { withDataGate } from './data-gate';
import { cloudClient, cloudProject } from './cloud-client';
import { applyCloudRecords, cloudBaseline, cloudConflictId, cloudLocalRecords, readCloudSetting, validateCloudCapacity, writeCloudSetting } from './cloud-local';
import { cloudRecordsSchema, mergeCloudRecords, sameCloudRecords } from '@/utils/cloud-merge';

let running: Promise<{ conflicts: number; skippedAlerts: number }> | undefined;
export function syncCloud() {
  if (running) return running;
  running = sync().finally(() => { running = undefined; });
  return running;
}
async function sync() {
  const api = await cloudClient();
  const { data: { session } } = await api.auth.getSession();
  if (!session) throw new Error('Sign in to sync your reminders.');
  const owner = session.user.id;
  if (readCloudSetting('owner') !== `${cloudProject}:${owner}`) throw new Error('Enable sync for this account first.');
  if (readCloudSetting('enabled') !== 'true') throw new Error('Cloud sync is paused.');
  const result = await withDataGate(async () => {
    const base = cloudBaseline();
    for (let attempt = 0; attempt < 3; attempt++) {
      const { data: metadata, error } = await api.from('duewise_cloud').select('revision, protocol').eq('user_id', owner).maybeSingle();
      let data: { revision: number; protocol: number; records?: unknown } | null = metadata;
      if (!error && metadata && String(metadata.revision) !== readCloudSetting('revision')) {
        const full = await api.from('duewise_cloud').select('revision, protocol, records').eq('user_id', owner).maybeSingle();
        if (full.error) throw new Error('Unable to download cloud reminders. Your local data is safe.');
        data = full.data;
      }
      if (error) throw new Error('Unable to read cloud reminders. Check your connection and cloud setup.');
      if (data && (!Number.isSafeInteger(data.revision) || data.revision < 1)) throw new Error('Invalid cloud revision. Sync stopped safely.');
      if (data && data.protocol !== 1) throw new Error('Update Duewise before syncing this cloud data.');
      const remote = cloudRecordsSchema.parse(data && String(data.revision) === readCloudSetting('revision') ? base : data?.records ?? {});
      let revision = data?.revision ?? 0;
      const local = cloudLocalRecords(Object.keys(base).length ? {} : remote);
      const merged = mergeCloudRecords(base, local, remote, cloudConflictId);
      validateCloudCapacity(merged.records);
      if (readCloudSetting('enabled') !== 'true') throw new Error('Cloud sync was paused.');
      if (!sameCloudRecords(merged.records, remote)) {
        const { data: saved, error: saveError } = await api.rpc('duewise_save', { expected_revision: data?.revision ?? 0, new_records: merged.records });
        if (saveError) throw new Error('Unable to upload reminders. Your local data is safe; try syncing again.');
        if (saved === null) continue;
        if (!Number.isSafeInteger(saved) || saved < 1) throw new Error('Invalid cloud revision. Try syncing again.');
        revision = saved;
      }
      return { changed: applyCloudRecords(merged.records, revision), conflicts: merged.conflicts };
    }
    throw new Error('Another device is syncing. Try again in a moment.');
  }, true);
  // Local commits and the sync checkpoint are atomic. Notifications use device-local IDs.
  const { rescheduleItem } = await import('./items');
  const { processNotificationCleanup } = await import('./notification-cleanup');
  let skippedAlerts = 0;
  try { await processNotificationCleanup(); } catch { skippedAlerts++; }
  const pending = JSON.parse(readCloudSetting('pendingAlerts') ?? '[]') as number[];
  const activeIds = new Set(db.select({ id: items.id }).from(items).all().map(row => row.id));
  const failed: number[] = [];
  for (const id of pending) {
    if (!activeIds.has(id)) continue;
    try { const scheduled = await rescheduleItem(id); skippedAlerts += scheduled.skippedReminderCount; }
    catch { skippedAlerts++; failed.push(id); }
  }
  writeCloudSetting('pendingAlerts', JSON.stringify(failed));
  writeCloudSetting('syncError', skippedAlerts ? 'Some alerts could not be scheduled. Review notification permissions and reminder details.' : '');
  return { conflicts: result.conflicts, skippedAlerts };
}
export async function enableCloudSync() {
  const api = await cloudClient();
  const { data: { session } } = await api.auth.getSession();
  if (!session) throw new Error('Sign in first.');
  const owner = readCloudSetting('owner');
  if (owner && owner !== `${cloudProject}:${session.user.id}`) throw new Error('This phone is linked to another account. Sign in with the original account to keep its reminders separate.');
  writeCloudSetting('owner', `${cloudProject}:${session.user.id}`);
  writeCloudSetting('enabled', 'true');
  return syncCloud();
}
export async function pauseCloudSync() {
  writeCloudSetting('enabled', 'false');
  try { await running; } catch { /* Pausing preserves any queued local changes. */ }
}
