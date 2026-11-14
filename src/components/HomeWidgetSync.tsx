import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import { addDatabaseChangeListener } from 'expo-sqlite';
import { refreshHomeWidget } from '@/services/home-widget';
import { widgetDateKey } from '@/utils/widget-model';

// Mounted only after migrations finish. SQLite events cover UI mutations,
// notification actions and backup imports without coupling them to widget code.
export default function HomeWidgetSync() {
  useEffect(() => {
    if (Platform.OS === 'web') return;
    let stopped = false;
    let pending: ReturnType<typeof setTimeout> | undefined;
    let updates = Promise.resolve();
    let day = widgetDateKey(new Date());
    const refresh = () => {
      if (pending) clearTimeout(pending);
      pending = setTimeout(() => {
        updates = updates.then(async () => { if (!stopped) await refreshHomeWidget(); }).catch(() => {
          // Widgets are optional: a failed OS refresh must not block reminders.
          // Foregrounding the app or the next mutation retries from the database.
        });
      }, 300);
    };
    refresh();
    const database = addDatabaseChangeListener((event) => {
      if (event.tableName === 'items' && /life-reminder\.db$/.test(event.databaseFilePath)) refresh();
    });
    const app = AppState.addEventListener('change', (state) => { if (state === 'active') refresh(); });
    const timer = setInterval(() => {
      const nextDay = widgetDateKey(new Date());
      if (AppState.currentState === 'active' && nextDay !== day) { day = nextDay; refresh(); }
    }, 60000);
    return () => { stopped = true; if (pending) clearTimeout(pending); database.remove(); app.remove(); clearInterval(timer); };
  }, []);
  return null;
}
