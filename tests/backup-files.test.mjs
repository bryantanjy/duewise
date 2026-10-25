import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import test from 'node:test';
import './support/register-typescript.mjs';
const writes = [];
globalThis.__backupPlatform = { OS: 'android' };
globalThis.__backupDirectoryPick = async () => ({ createFile: (name, mimeType) => ({ write: (text) => writes.push({ name, mimeType, text }) }) });
globalThis.__backupDocumentPick = async () => ({ canceled: true });
globalThis.__backupFileRead = 0;
globalThis.__backupFileSize = 10;
globalThis.__backupFileText = '{}';
globalThis.__backupNativePick = async () => ({ canceled: true, result: null });
registerHooks({ resolve(specifier, context, nextResolve) {
  const stubs = {
    'react-native': 'export const Platform = globalThis.__backupPlatform;',
    'expo-file-system': `
      export const Directory = { pickDirectoryAsync: () => globalThis.__backupDirectoryPick() };
      export class File {
        static pickFileAsync(options) { return globalThis.__backupNativePick(options); }
        get size() { return globalThis.__backupFileSize; }
        async text() { globalThis.__backupFileRead++; return globalThis.__backupFileText; }
      }
    `,
    'expo-document-picker': 'export const getDocumentAsync = () => globalThis.__backupDocumentPick();',
  };
  if (specifier in stubs) return { url: 'data:text/javascript,' + encodeURIComponent(stubs[specifier]), shortCircuit: true };
  if (specifier.startsWith('@/')) return nextResolve(new URL('../src/' + specifier.slice(2) + '.ts', import.meta.url).href, context);
  return nextResolve(specifier, context);
} });
const { exportBackupFile, chooseBackupFile } = await import('../src/services/backup-files.ts');
const backup = { format: 'duewise-backup', version: 1, exportedAt: '2026-10-24T00:00:00Z', items: [] };

test('backup export writes only after a user-selected folder is returned', async () => {
  writes.length = 0;
  let picked = false;
  globalThis.__backupDirectoryPick = async () => {
    assert.equal(writes.length, 0);
    picked = true;
    return { createFile: (name, mimeType) => ({ write: (text) => writes.push({ name, mimeType, text }) }) };
  };
  const name = await exportBackupFile(backup);
  assert.equal(picked, true);
  assert.match(name, /^duewise-backup-.*\.json$/);
  assert.equal(writes[0].mimeType, 'application/json');
  assert.deepEqual(JSON.parse(writes[0].text), backup);
});

test('cancelling the destination picker writes no backup', async () => {
  writes.length = 0;
  globalThis.__backupDirectoryPick = async () => { throw Object.assign(new Error('Cancelled'), { code: 'ERR_PICKER_CANCELLED' }); };
  assert.equal(await exportBackupFile(backup), undefined);
  assert.equal(writes.length, 0);
});

test('cancelled file selection does not read a file and oversized files are rejected before reading', async () => {
  globalThis.__backupPlatform.OS = 'ios';
  globalThis.__backupFileRead = 0;
  globalThis.__backupDocumentPick = async () => ({ canceled: true });
  assert.equal(await chooseBackupFile(), undefined);
  globalThis.__backupDocumentPick = async () => ({ canceled: false, assets: [{ name: 'large.json', uri: 'file:///selected', size: 11 * 1024 * 1024 }] });
  await assert.rejects(chooseBackupFile(), /10 MB/);
  assert.equal(globalThis.__backupFileRead, 0);
});

test('selected files are validated before a preview is returned', async () => {
  globalThis.__backupPlatform.OS = 'ios';
  globalThis.__backupDocumentPick = async () => ({ canceled: false, assets: [{ name: 'backup.json', uri: 'file:///selected' }] });
  globalThis.__backupFileText = '{invalid';
  await assert.rejects(chooseBackupFile(), /valid JSON/);
  globalThis.__backupFileText = JSON.stringify(backup);
  assert.deepEqual(await chooseBackupFile(), { name: 'backup.json', backup });
});


test('Android reads the file granted by FileSystem without using an unscoped DocumentPicker cache path', async () => {
  globalThis.__backupPlatform.OS = 'android';
  globalThis.__backupDocumentPick = async () => { throw new Error('DocumentPicker cache is outside FileSystem READ scope'); };
  globalThis.__backupNativePick = async (options) => {
    assert.equal(options.multipleFiles, false);
    return { canceled: false, result: { name: 'existing-backup.json', size: 100,
      text: async () => JSON.stringify(backup) } };
  };
  assert.deepEqual(await chooseBackupFile(), { name: 'existing-backup.json', backup });
});

test('Android picker cancellation and oversize detection do not read backup contents', async () => {
  globalThis.__backupPlatform.OS = 'android';
  globalThis.__backupNativePick = async () => ({ canceled: true, result: null });
  assert.equal(await chooseBackupFile(), undefined);
  let reads = 0;
  globalThis.__backupNativePick = async () => ({ canceled: false, result: { name: 'large.json', size: 11 * 1024 * 1024, text: async () => { reads++; return '{}'; } } });
  await assert.rejects(chooseBackupFile(), /10 MB/);
  assert.equal(reads, 0);
});
