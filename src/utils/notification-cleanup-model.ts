export function uniqueNotificationIds(ids: (string | null)[]) {
  return [...new Set(ids.filter((id): id is string => Boolean(id?.trim())))];
}

type CleanupRow = { id: number; notificationId: string };

export async function processCleanupRows(
  rows: CleanupRow[],
  cancel: (notificationId: string) => Promise<void>,
) {
  const completedIds: number[] = [];
  const failures: { id: number; message: string }[] = [];

  for (const row of rows) {
    try {
      await cancel(row.notificationId);
      completedIds.push(row.id);
    } catch (error) {
      failures.push({
        id: row.id,
        message: error instanceof Error ? error.message : 'Unable to cancel notification.',
      });
    }
  }

  return { completedIds, failures };
}
