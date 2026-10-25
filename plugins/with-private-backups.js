const { withAndroidManifest, withDangerousMod } = require('expo/config-plugins');
const fs = require('node:fs/promises');
const path = require('node:path');

const domains = ['root', 'file', 'database', 'sharedpref', 'external',
  'device_root', 'device_file', 'device_database', 'device_sharedpref'];
const exclusions = domains.map(domain => `    <exclude domain="${domain}" path="." />`).join('\n');

async function writeBackupRules(platformProjectRoot) {
  const directory = path.join(platformProjectRoot, 'app', 'src', 'main', 'res', 'xml');
  await fs.mkdir(directory, { recursive: true });
  await fs.writeFile(path.join(directory, 'duewise_backup_rules.xml'),
    `<?xml version="1.0" encoding="utf-8"?>\n<full-backup-content>\n${exclusions}\n</full-backup-content>\n`);
  await fs.writeFile(path.join(directory, 'duewise_data_extraction_rules.xml'),
    `<?xml version="1.0" encoding="utf-8"?>\n<data-extraction-rules>\n  <cloud-backup>\n${exclusions}\n  </cloud-backup>\n  <device-transfer>\n${exclusions}\n  </device-transfer>\n</data-extraction-rules>\n`);
}

function withPrivateBackups(config) {
  config = withAndroidManifest(config, next => {
    const app = next.modResults.manifest.application[0].$;
    app['android:allowBackup'] = 'false';
    app['android:fullBackupContent'] = '@xml/duewise_backup_rules';
    app['android:dataExtractionRules'] = '@xml/duewise_data_extraction_rules';
    return next;
  });
  return withDangerousMod(config, ['android', async next => {
    await writeBackupRules(next.modRequest.platformProjectRoot);
    return next;
  }]);
}
module.exports = withPrivateBackups;
module.exports.writeBackupRules = writeBackupRules;
