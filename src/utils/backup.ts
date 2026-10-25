import { z } from 'zod';
import { parseStoredDate } from './item-form';

export const MAX_BACKUP_BYTES = 10 * 1024 * 1024;
const date = z.string().refine((value) => Boolean(parseStoredDate(value)), 'Invalid calendar date');
const timestamp = z.string().datetime({ offset: true });
const backupItemSchema = z.object({
  name: z.string().min(1).max(1000),
  category: z.object({ name: z.string().min(1).max(100), icon: z.string().max(100).nullable(), color: z.string().regex(/^#[0-9a-f]{6}$/i).nullable() }).nullable(),
  dateType: z.enum(['expiry', 'renewal', 'birthday', 'custom']),
  targetDate: date,
  reminderTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  repeatType: z.enum(['none', 'daily', 'weekly', 'monthly', 'yearly', 'custom']),
  repeatInterval: z.number().int().min(1).max(3650),
  importance: z.enum(['low', 'normal', 'high']),
  notes: z.string().max(100000).nullable(),
  archived: z.boolean(),
  createdAt: timestamp,
  updatedAt: timestamp,
  reminderDays: z.array(z.number().int().min(0).max(3650)).max(3651).transform((values) => [...new Set(values)].sort((a, b) => b - a)),
  history: z.array(z.object({ action: z.string().min(1).max(100), previousDate: date.nullable(), newDate: date.nullable(), createdAt: timestamp })).max(10000),
});
export const backupSchema = z.object({
  format: z.literal('duewise-backup'),
  version: z.literal(1),
  exportedAt: timestamp,
  items: z.array(backupItemSchema).max(10000),
});
export type Backup = z.infer<typeof backupSchema>;
export type BackupItem = Backup['items'][number];

export function parseBackup(text: string): Backup {
  if (new TextEncoder().encode(text).byteLength > MAX_BACKUP_BYTES) throw new Error('Backup files must be smaller than 10 MB.');
  let value: unknown;
  try { value = JSON.parse(text); } catch { throw new Error('This file is not valid JSON. Choose a Duewise backup.'); }
  if (value && typeof value === 'object' && 'version' in value && value.version !== 1) throw new Error('This backup version is not supported. Update Duewise and try again.');
  const result = backupSchema.safeParse(value);
  if (!result.success) throw new Error('This backup contains invalid or missing reminder data. Nothing has been restored.');
  return result.data;
}

// Exclude device IDs, category styling and modification timestamps from duplicate matching.
// This remains stable after notifications are recreated or local category colors differ.
export function backupItemKey(item: BackupItem) {
  return JSON.stringify([
    item.createdAt, item.name, item.category?.name ?? null, item.dateType, item.targetDate,
    item.reminderTime, item.repeatType, item.repeatInterval, item.importance, item.notes,
    item.archived, [...item.reminderDays].sort((a, b) => b - a),
    item.history.map((entry) => JSON.stringify([entry.action, entry.previousDate, entry.newDate, entry.createdAt])).sort(),
  ]);
}

export function backupPreview(backup: Backup, existing: BackupItem[]) {
  const keys = new Set(existing.map(backupItemKey));
  const additions: BackupItem[] = [];
  let duplicates = 0;
  for (const item of backup.items) {
    const key = backupItemKey(item);
    if (keys.has(key)) { duplicates++; continue; }
    keys.add(key);
    additions.push(item);
  }
  return { additions, duplicates, active: additions.filter((item) => !item.archived).length, archived: additions.filter((item) => item.archived).length };
}
