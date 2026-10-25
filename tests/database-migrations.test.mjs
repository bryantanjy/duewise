import assert from 'node:assert/strict';
import test from 'node:test';
import { readdirSync, readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import './support/register-typescript.mjs';
import { drizzle } from '../node_modules/drizzle-orm/expo-sqlite/driver.js';
import { migrate } from '../node_modules/drizzle-orm/expo-sqlite/migrator.js';
import { expoSqliteNodeAdapter } from './support/expo-sqlite-node-adapter.mjs';
import { migrateWithIntegrityChecks } from '../src/utils/database-migrations.ts';

const root = new URL('../drizzle/', import.meta.url);
const names = readdirSync(root).filter(name => /^\d{14}_/.test(name)).sort();
const migrations = Object.fromEntries(names.map(name => [name, readFileSync(new URL(name + '/migration.sql', root), 'utf8')]));
function setup(t) {
  const database = new DatabaseSync(':memory:');
  database.exec('PRAGMA foreign_keys=ON');
  t.after(() => database.close());
  const connection = { ...expoSqliteNodeAdapter(database),
    execSync: sql => database.exec(sql), getAllSync: sql => database.prepare(sql).all() };
  return { database, connection };
}
function seed(database) {
  database.exec(`INSERT INTO categories VALUES (1,'Personal',NULL,NULL,'2026-09-14T00:00:00Z');
    INSERT INTO items (id,name,category_id,date_type,target_date,created_at,updated_at)
    VALUES (1,'Keep this reminder',1,'expiry','2099-01-01','2026-09-14T00:00:00Z','2026-09-14T00:00:00Z');
    INSERT INTO reminders (item_id,days_before,notification_id) VALUES (1,7,'keep-this-alert');`);
}
async function apply(connection, source = migrations) {
  return migrateWithIntegrityChecks(connection, guarded => migrate(drizzle(guarded), { migrations: source }));
}

for (const count of [0, 1, 3]) test(`fresh or populated schema at migration ${count} upgrades with data and integrity intact`, async t => {
  const { database, connection } = setup(t);
  if (count) {
    await migrate(drizzle(connection), { migrations: Object.fromEntries(Object.entries(migrations).slice(0, count)) });
    seed(database);
  }
  await apply(connection);
  await apply(connection); // Already-applied migrations must not run twice.
  assert.equal(database.prepare('PRAGMA foreign_keys').get().foreign_keys, 1);
  assert.deepEqual(database.prepare('PRAGMA foreign_key_check').all(), []);
  if (count) {
    assert.equal(database.prepare('SELECT name FROM items').get().name, 'Keep this reminder');
    assert.equal(database.prepare('SELECT notification_id FROM reminders').get().notification_id, 'keep-this-alert');
  }
  assert.equal(database.prepare('SELECT reminder_time,repeat_interval FROM items LIMIT 1').columns().length, 2);
  assert.equal(database.prepare('SELECT count(*) AS n FROM __drizzle_migrations').get().n, names.length);
});

test('failed migration rolls back and restores foreign key enforcement', async t => {
  const { database, connection } = setup(t);
  await apply(connection); seed(database);
  await assert.rejects(apply(connection, { ...migrations, '20990101000000_bad': 'DELETE FROM items; --> statement-breakpoint INVALID SQL;' }));
  assert.equal(database.prepare('SELECT name FROM items').get().name, 'Keep this reminder');
  assert.equal(database.prepare('PRAGMA foreign_keys').get().foreign_keys, 1);
});

test('commit guard rejects orphaning migrations before commit and preserves original rows', async t => {
  const { database, connection } = setup(t);
  await apply(connection); seed(database);
  await assert.rejects(apply(connection, { ...migrations, '20990101000000_orphan': 'DELETE FROM categories;' }), error => /inconsistent/.test(error.cause?.message ?? error.message));
  assert.equal(database.prepare('SELECT name FROM categories').get().name, 'Personal');
  assert.equal(database.prepare('SELECT count(*) AS n FROM __drizzle_migrations').get().n, names.length);
  assert.equal(database.prepare('PRAGMA foreign_keys').get().foreign_keys, 1);
});
