import * as SQLite from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';

const sqlite = SQLite.openDatabaseSync('life-reminder.db', {
  enableChangeListener: true,
});

export const db = drizzle(sqlite);

export { sqlite };