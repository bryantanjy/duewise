type MigrationConnection = {
  execSync: (sql: string) => void;
  getAllSync: <T>(sql: string) => T[];
  prepareSync: (sql: string) => unknown;
};

// Historical SQLite table rebuilds need foreign_keys disabled BEFORE BEGIN.
// Check references before every COMMIT so invalid new data still rolls back.
export async function migrateWithIntegrityChecks<T extends MigrationConnection>(
  connection: T, run: (migrationConnection: T) => Promise<unknown>,
) {
  function checkReferences() {
    if (connection.getAllSync('PRAGMA foreign_key_check').length) {
      throw new Error('Database references are inconsistent. Migration stopped to protect your reminders.');
    }
  }
  checkReferences();
  try {
    connection.execSync('PRAGMA foreign_keys = OFF');
    if (connection.getAllSync<{ foreign_keys: number }>('PRAGMA foreign_keys')[0]?.foreign_keys !== 0) {
      throw new Error('Database migration must start outside a transaction.');
    }
    const guarded = new Proxy(connection, {
      get(target, property) {
        if (property === 'prepareSync') return (sql: string) => {
          if (/^COMMIT(?:\s+TRANSACTION)?\s*;?$/i.test(sql.trim())) checkReferences();
          return target.prepareSync(sql);
        };
        const value = Reflect.get(target, property, target);
        return typeof value === 'function' ? value.bind(target) : value;
      },
    });
    await run(guarded);
    checkReferences();
  } finally {
    connection.execSync('PRAGMA foreign_keys = ON');
    if (connection.getAllSync<{ foreign_keys: number }>('PRAGMA foreign_keys')[0]?.foreign_keys !== 1) {
      throw new Error('Unable to restore database integrity checks. Reopen Duewise before continuing.');
    }
  }
}
