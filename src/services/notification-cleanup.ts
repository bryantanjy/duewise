import { eq, sql } from 'drizzle-orm';
import { isRunningInExpoGo } from 'expo';
import { Platform } from 'react-native';

import { db } from '@/db';
import { notificationCleanup } from '@/db/schema';
import {
  processCleanupRows,
  uniqueNotificationIds,
} from '@/utils/notification-cleanup-model';
import { notificationRuntimeSupported } from '@/utils/notification-runtime';

type CancelNotification = (notificationId: string) => Promise<void>;

async function loadDeviceCancel(): Promise<CancelNotification | undefined> {
  const runningInAndroidExpoGo = Platform.OS === 'android' && isRunningInExpoGo();
  if (!notificationRuntimeSupported(Platform.OS, runningInAndroidExpoGo)) {
    return undefined;
  }

  const { deviceNotificationAdapter } = await import('./notifications');
  return deviceNotificationAdapter.cancel;
}

export async function enqueueNotificationCleanup(ids: (string | null)[]) {
  const notificationIds = uniqueNotificationIds(ids);
  if (notificationIds.length === 0) return;

  await db
    .insert(notificationCleanup)
    .values(notificationIds.map((notificationId) => ({ notificationId })))
    .onConflictDoNothing();
}

export async function processNotificationCleanup(cancel?: CancelNotification) {
  const cancelNotification = cancel ?? (await loadDeviceCancel());
  if (!cancelNotification) return;

  const rows = await db
    .select({
      id: notificationCleanup.id,
      notificationId: notificationCleanup.notificationId,
    })
    .from(notificationCleanup);
  const result = await processCleanupRows(rows, cancelNotification);

  for (const id of result.completedIds) {
    await db.delete(notificationCleanup).where(eq(notificationCleanup.id, id));
  }

  for (const failure of result.failures) {
    await db
      .update(notificationCleanup)
      .set({
        attempts: sql`${notificationCleanup.attempts} + 1`,
        lastError: failure.message,
      })
      .where(eq(notificationCleanup.id, failure.id));
  }

  return result;
}
