import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { writeBackupRules } = require('../plugins/with-private-backups.js');
const app = JSON.parse(await readFile(new URL('../app.json', import.meta.url), 'utf8')).expo;

test('release config blocks broad overlay/storage access without blocking reminders', () => {
  const blocked = app.android.blockedPermissions;
  for (const permission of ['SYSTEM_ALERT_WINDOW', 'READ_EXTERNAL_STORAGE', 'WRITE_EXTERNAL_STORAGE']) {
    assert.ok(blocked.includes('android.permission.' + permission));
  }
  for (const permission of ['POST_NOTIFICATIONS', 'RECEIVE_BOOT_COMPLETED', 'VIBRATE']) {
    assert.ok(!blocked.includes('android.permission.' + permission));
  }
  assert.equal(app.android.allowBackup, false);
  assert.ok(app.plugins.includes('./plugins/with-private-backups'));
});

test('legacy backup, cloud backup, and device transfer all exclude private app storage', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'duewise-policy-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await writeBackupRules(directory);
  const xmlDirectory = join(directory, 'app', 'src', 'main', 'res', 'xml');
  const legacy = await readFile(join(xmlDirectory, 'duewise_backup_rules.xml'), 'utf8');
  const modern = await readFile(join(xmlDirectory, 'duewise_data_extraction_rules.xml'), 'utf8');
  const sections = [legacy, modern.match(/<cloud-backup>([\s\S]*?)<\/cloud-backup>/)[1],
    modern.match(/<device-transfer>([\s\S]*?)<\/device-transfer>/)[1]];
  for (const section of sections) for (const domain of ['root','file','database','sharedpref','external',
    'device_root','device_file','device_database','device_sharedpref']) {
    assert.ok(section.includes(`<exclude domain="${domain}" path="." />`));
  }
});
