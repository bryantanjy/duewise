import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';

const migrationUrl = new URL(
  '../drizzle/20260918060559_new_spirit/migration.sql',
  import.meta.url,
);

test('cleanup migration enforces unique IDs and defaults attempts to zero', () => {
  const database = new DatabaseSync(':memory:');
  try {
    const sql = readFileSync(migrationUrl, 'utf8')
      .replaceAll('--> statement-breakpoint', '\n');
    database.exec(sql);

    database.prepare(
      'INSERT INTO notification_cleanup (notification_id, created_at) VALUES (?, ?)',
    ).run('native-1', '2026-09-18T00:00:00.000Z');

    assert.throws(
      () => database.prepare(
        'INSERT INTO notification_cleanup (notification_id, created_at) VALUES (?, ?)',
      ).run('native-1', '2026-09-18T00:00:01.000Z'),
      /UNIQUE constraint failed/,
    );
    assert.deepEqual(
      {
        ...database.prepare(
          'SELECT notification_id, attempts, last_error FROM notification_cleanup',
        ).get(),
      },
      { notification_id: 'native-1', attempts: 0, last_error: null },
    );
  } finally {
    database.close();
  }
});
