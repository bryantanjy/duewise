import * as SQLite from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';

const sqlite = SQLite.openDatabaseSync('life-reminder.db', {
  enableChangeListener: true,
});

sqlite.execSync('PRAGMA journal_mode = WAL;');
sqlite.execSync('PRAGMA foreign_keys = ON;');

export const db = drizzle(sqlite);

export { sqlite };
