import { DatabaseSync } from 'node:sqlite';

export function createSqliteItemRepository() {
  const database = new DatabaseSync(':memory:');
  database.exec(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE,
      icon TEXT, color TEXT, created_at TEXT NOT NULL
    );
    INSERT INTO categories (id, name, created_at) VALUES (1, 'Personal', '2026-09-18T00:00:00Z');
    CREATE TABLE items (
      id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL,
      category_id INTEGER REFERENCES categories(id), date_type TEXT NOT NULL,
      target_date TEXT NOT NULL, reminder_time TEXT NOT NULL DEFAULT '09:00', repeat_interval INTEGER NOT NULL DEFAULT 1, repeat_type TEXT NOT NULL DEFAULT 'none',
      importance TEXT NOT NULL DEFAULT 'normal', notes TEXT,
      archived INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    );
    CREATE TABLE reminders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
      days_before INTEGER NOT NULL, notification_id TEXT, is_snooze INTEGER NOT NULL DEFAULT 0, enabled INTEGER NOT NULL DEFAULT 1
    );
    CREATE TABLE item_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
      previous_date TEXT, new_date TEXT, action TEXT NOT NULL, created_at TEXT NOT NULL
    );
    CREATE TABLE notification_cleanup (
      id INTEGER PRIMARY KEY AUTOINCREMENT, notification_id TEXT NOT NULL UNIQUE,
      attempts INTEGER NOT NULL DEFAULT 0, last_error TEXT, created_at TEXT NOT NULL
    );
  `);
  if (database.prepare('PRAGMA foreign_keys').get().foreign_keys !== 1) {
    throw new Error('SQLite foreign keys must be enabled.');
  }

  function transaction(work) {
    database.exec('BEGIN');
    try {
      const result = work();
      database.exec('COMMIT');
      return result;
    } catch (error) {
      database.exec('ROLLBACK');
      throw error;
    }
  }

  function insertReminders(itemId, rows) {
    const insert = database.prepare(
      'INSERT INTO reminders (item_id, days_before, notification_id) VALUES (?, ?, ?)',
    );
    for (const row of rows) insert.run(itemId, row.daysBefore, row.notificationId);
  }

  function enqueue(ids) {
    const insert = database.prepare(
      'INSERT INTO notification_cleanup (notification_id, created_at) VALUES (?, ?) ON CONFLICT DO NOTHING',
    );
    for (const id of new Set(ids)) insert.run(id, new Date().toISOString());
  }

  function replaceReminders(itemId, rows) {
    database.prepare('DELETE FROM reminders WHERE item_id = ?').run(itemId);
    insertReminders(itemId, rows);
  }

  const repository = {
    async createItemRecord(input) {
      return transaction(() => Number(database.prepare(`
        INSERT INTO items (category_id, date_type, importance, name, notes,
          repeat_type, target_date, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(input.categoryId, input.dateType, input.importance, input.name.trim(),
        input.notes?.trim() || null, input.repeatType, input.targetDate,
        new Date().toISOString(), new Date().toISOString()).lastInsertRowid));
    },
    async getItemBundle(itemId) {
      const item = database.prepare(`
        SELECT id, name, archived, repeat_type AS repeatType, target_date AS targetDate
        FROM items WHERE id = ?
      `).get(itemId);
      if (!item) return undefined;
      return {
        item: { ...item, archived: Boolean(item.archived) },
        reminders: database.prepare(`
          SELECT days_before AS daysBefore, notification_id AS notificationId
          FROM reminders WHERE item_id = ? ORDER BY id
        `).all(itemId).map((row) => ({ ...row })),
      };
    },
    async commitCreatedReminders(itemId, rows) {
      transaction(() => insertReminders(itemId, rows));
    },
    async commitEdit({ input, itemId, oldNotificationIds, reminders }) {
      transaction(() => {
        database.prepare(`UPDATE items SET category_id = ?, date_type = ?, importance = ?,
          name = ?, notes = ?, repeat_type = ?, target_date = ?, updated_at = ? WHERE id = ?
        `).run(input.categoryId, input.dateType, input.importance, input.name.trim(),
          input.notes?.trim() || null, input.repeatType, input.targetDate,
          new Date().toISOString(), itemId);
        replaceReminders(itemId, reminders);
        enqueue(oldNotificationIds);
      });
    },
    async commitRenew({ itemId, newTargetDate, oldNotificationIds, previousTargetDate, reminders }) {
      transaction(() => {
        database.prepare(`INSERT INTO item_history
          (item_id, previous_date, new_date, action, created_at) VALUES (?, ?, ?, 'renewed', ?)
        `).run(itemId, previousTargetDate, newTargetDate, new Date().toISOString());
        database.prepare('UPDATE items SET target_date = ?, updated_at = ? WHERE id = ?')
          .run(newTargetDate, new Date().toISOString(), itemId);
        replaceReminders(itemId, reminders);
        enqueue(oldNotificationIds);
      });
    },
    async commitArchive({ itemId, oldNotificationIds }) {
      transaction(() => {
        database.prepare('UPDATE items SET archived = 1, updated_at = ? WHERE id = ?')
          .run(new Date().toISOString(), itemId);
        database.prepare('UPDATE reminders SET notification_id = NULL WHERE item_id = ?').run(itemId);
        enqueue(oldNotificationIds);
      });
    },
    async commitRestore({ itemId, reminders }) {
      transaction(() => {
        database.prepare('UPDATE items SET archived = 0, updated_at = ? WHERE id = ?')
          .run(new Date().toISOString(), itemId);
        replaceReminders(itemId, reminders);
      });
    },
    async commitDelete({ itemId, oldNotificationIds }) {
      transaction(() => {
        enqueue(oldNotificationIds);
        database.prepare('DELETE FROM items WHERE id = ?').run(itemId);
      });
    },
    async deleteProvisionalItem(itemId) {
      transaction(() => database.prepare('DELETE FROM items WHERE id = ?').run(itemId));
    },
  };

  return { database, repository, close: () => database.close() };
}
