import { openDatabaseAsync } from 'expo-sqlite';
import type { WidgetItem } from '@/utils/widget-model';

// A separate connection lets Android's headless task read reminders without
// mounting React, running migrations, or closing the app's live connection.
export async function readWidgetItems(): Promise<WidgetItem[]> {
  const connection = await openDatabaseAsync('life-reminder.db', { useNewConnection: true });
  try {
    const table = await connection.getFirstAsync("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'items'");
    if (!table) return [];
    return await connection.getAllAsync<WidgetItem>(
      'SELECT id, name, target_date AS targetDate, archived FROM items WHERE archived = 0',
    );
  } finally {
    await connection.closeAsync();
  }
}
