// The synchronous subset used by the installed Drizzle Expo driver.
// SQL still executes in a real isolated Node SQLite database.
export function expoSqliteNodeAdapter(database) {
  return {
    prepareSync(sql) {
      const statement = database.prepare(sql);
      function execute(params, arrays) {
        statement.setReturnArrays(arrays);
        if (statement.columns().length > 0) {
          const rows = statement.all(...params);
          return { getAllSync: () => rows, getFirstSync: () => rows[0] ?? null };
        }
        const result = statement.run(...params);
        return {
          changes: result.changes, lastInsertRowId: Number(result.lastInsertRowid),
          getAllSync: () => [], getFirstSync: () => null,
        };
      }
      return {
        executeSync: (params = []) => execute(params, false),
        executeForRawResultSync: (params = []) => execute(params, true),
      };
    },
  };
}
