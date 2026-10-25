import { Platform } from 'react-native';
import { MAX_BACKUP_BYTES, parseBackup, type Backup } from '@/utils/backup';

export async function exportBackupFile(backup: Backup) {
  if (Platform.OS === 'web') throw new Error('Backup files are available on Android and iOS.');
  const { Directory } = await import('expo-file-system');
  const text = JSON.stringify(backup, null, 2);
  if (new TextEncoder().encode(text).byteLength > MAX_BACKUP_BYTES) throw new Error('This backup exceeds the 10 MB file limit.');
  let directory;
  try { directory = await Directory.pickDirectoryAsync(); }
  catch (error) {
    const code = error && typeof error === 'object' && 'code' in error ? error.code : undefined;
    if (code === 'ERR_PICKER_CANCELLED' || code === 'ERR_FILE_PICKING_CANCELLED') return undefined;
    throw error;
  }
  const name = `duewise-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  const file = directory.createFile(name, 'application/json');
  file.write(text);
  return name;
}

export async function chooseBackupFile() {
  if (Platform.OS === 'web') throw new Error('Backup files are available on Android and iOS.');
  if (Platform.OS === 'android') {
    // Keep the Android URI grant in FileSystem. DocumentPicker's copied cache
    // path can fall outside FileSystem's scoped directory in Expo Go.
    const { File } = await import('expo-file-system');
    const selected = await File.pickFileAsync({ mimeTypes: '*/*', multipleFiles: false });
    if (selected.canceled) return undefined;
    const file = selected.result;
    if (file.size > MAX_BACKUP_BYTES) throw new Error('Backup files must be smaller than 10 MB.');
    return { name: file.name, backup: parseBackup(await file.text()) };
  }
  const DocumentPicker = await import('expo-document-picker');
  const result = await DocumentPicker.getDocumentAsync({ type: '*/*', multiple: false, copyToCacheDirectory: true });
  if (result.canceled) return undefined;
  const asset = result.assets[0];
  if (asset.size !== undefined && asset.size > MAX_BACKUP_BYTES) throw new Error('Backup files must be smaller than 10 MB.');
  const { File } = await import('expo-file-system');
  const file = new File(asset.uri);
  if (file.size > MAX_BACKUP_BYTES) throw new Error('Backup files must be smaller than 10 MB.');
  return { name: asset.name, backup: parseBackup(await file.text()) };
}
