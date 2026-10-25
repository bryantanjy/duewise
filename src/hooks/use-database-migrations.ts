import { useEffect, useState } from 'react';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import { migrate } from 'drizzle-orm/expo-sqlite/migrator';
import migrations from '../../drizzle/migrations';
import { sqlite } from '@/db';
import { migrateWithIntegrityChecks } from '@/utils/database-migrations';

// Share startup work across Strict Mode mounts. The app stays gated until ready.
let startup: Promise<unknown> | undefined;
export function useDatabaseMigrations() {
  const [result, setResult] = useState<{ success: boolean; error?: Error }>({ success: false });
  useEffect(() => {
    let active = true;
    startup ??= migrateWithIntegrityChecks(sqlite, connection => migrate(drizzle(connection),
      migrations as unknown as Parameters<typeof migrate>[1]));
    void startup.then(() => { if (active) setResult({ success: true }); }, error => {
      if (active) setResult({ success: false, error: error instanceof Error ? error : new Error('Unable to migrate database.') });
    });
    return () => { active = false; };
  }, []);
  return result;
}
