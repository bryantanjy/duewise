import { z } from 'zod';
import { backupSchema, backupItemKey, type BackupItem } from './backup';
export const cloudRecordsSchema = z.record(z.string().uuid(), backupSchema.shape.items.element).refine(records => Object.keys(records).length <= 10000, 'Too many cloud reminders');
export type CloudRecords = Record<string, BackupItem>;
const key = (item?: BackupItem) => item ? backupItemKey(item) + JSON.stringify(item.category) : null;
export function sameCloudRecords(a: CloudRecords, b: CloudRecords) {
  const ids = Object.keys(a);
  return ids.length === Object.keys(b).length && ids.every(id => key(a[id]) === key(b[id]));
}
export function mergeCloudRecords(base: CloudRecords, local: CloudRecords, remote: CloudRecords, uuid: (source: string, item: BackupItem) => string) {
  const merged: CloudRecords = {};
  let conflicts = 0;
  for (const id of new Set([...Object.keys(base), ...Object.keys(local), ...Object.keys(remote)])) {
    const before = base[id], here = local[id], there = remote[id];
    if (key(here) === key(there)) { if (here) merged[id] = here; }
    else if (key(here) === key(before)) { if (there) merged[id] = there; }
    else if (key(there) === key(before)) { if (here) merged[id] = here; }
    else if (!here || !there) {
      // An edit beats a concurrent delete; no silently discarded edits.
      merged[id] = here ?? there;
      conflicts++;
    } else {
      merged[id] = there;
      merged[uuid(id, here)] = { ...here, name: `${here.name.slice(0, 980)} (conflict copy)` };
      conflicts++;
    }
  }
  return { records: merged, conflicts };
}
