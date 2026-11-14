import { assertLocalWritesAllowed } from './data-gate';
import { requireOptionalNativeModule } from 'expo';
import { and, count, eq, sum } from 'drizzle-orm';
import { Platform } from 'react-native';
import { db } from '@/db';
import { attachments, items } from '@/db/schema';
import { attachmentCacheName, attachmentMimeType, attachmentName, attachmentSchema, MAX_ATTACHMENT_BYTES, MAX_ATTACHMENTS_PER_ITEM, MAX_TOTAL_ATTACHMENT_BYTES, type AttachmentData } from '@/utils/attachments';

export function storeAttachment(itemId: number, input: AttachmentData) {
  assertLocalWritesAllowed();
  const data = attachmentSchema.parse(input);
  return db.transaction(tx => {
    if (!tx.select({ id: items.id }).from(items).where(eq(items.id, itemId)).get()) throw new Error('This reminder no longer exists.');
    const existing = tx.select({ total: count() }).from(attachments).where(eq(attachments.itemId, itemId)).get();
    if ((existing?.total ?? 0) >= MAX_ATTACHMENTS_PER_ITEM) throw new Error('Each reminder can hold up to 5 attachments. Remove one before adding another.');
    const used = Number(tx.select({ total: sum(attachments.size) }).from(attachments).get()?.total ?? 0);
    if (used + data.size > MAX_TOTAL_ATTACHMENT_BYTES) throw new Error('Attachments have reached the 25 MB app limit. Remove unused attachments and try again.');
    return tx.insert(attachments).values({ ...data, itemId }).returning({ id: attachments.id }).get();
  });
}

export async function addAttachment(itemId: number) {
  if (Platform.OS === 'web') throw new Error('Attachments are available in the Android and iOS app.');
  const { File } = await import('expo-file-system');
  let file;
  let name: string;
  let reportedType: string | undefined;
  if (Platform.OS === 'android') {
    const result = await File.pickFileAsync({ mimeTypes: ['application/pdf', 'image/*'], multipleFiles: false });
    if (result.canceled) return undefined;
    file = result.result; name = file.name; reportedType = file.type;
  } else {
    const { getDocumentAsync } = await import('expo-document-picker');
    const result = await getDocumentAsync({ type: ['application/pdf', 'image/*'], copyToCacheDirectory: true, multiple: false });
    if (result.canceled) return undefined;
    const asset = result.assets[0];
    if (asset.size !== undefined && asset.size > MAX_ATTACHMENT_BYTES) throw new Error('Choose a file no larger than 5 MB.');
    file = new File(asset.uri); name = asset.name; reportedType = asset.mimeType;
  }
  const mimeType = attachmentMimeType(name, reportedType);
  if (!file.size || file.size > MAX_ATTACHMENT_BYTES) throw new Error('Choose a nonempty file no larger than 5 MB.');
  return storeAttachment(itemId, { name: attachmentName(name), mimeType, size: file.size, base64: await file.base64() });
}

export async function shareAttachment(itemId: number, id: number) {
  if (Platform.OS === 'web') throw new Error('Attachments are available in the Android and iOS app.');
  const row = db.select().from(attachments).where(and(eq(attachments.id, id), eq(attachments.itemId, itemId))).get();
  if (!row) throw new Error('This attachment no longer exists.');
  if (!requireOptionalNativeModule('ExpoSharing')) throw new Error('Install the new Duewise build to open or share attachments.');
  const Sharing = await import('expo-sharing');
  if (!await Sharing.isAvailableAsync()) throw new Error('No file-sharing apps are available on this device.');
  const { File, Paths } = await import('expo-file-system');
  const file = new File(Paths.cache, attachmentCacheName(id, row.mimeType));
  file.create({ overwrite: true });
  file.write(row.base64, { encoding: 'base64' });
  // Keep the cache file available while the receiving app reads its URI grant.
  await Sharing.shareAsync(file.uri, { mimeType: row.mimeType, dialogTitle: row.name });
}

export async function removeAttachment(itemId: number, id: number) {
  assertLocalWritesAllowed();
  const row = db.select({ mimeType: attachments.mimeType }).from(attachments).where(and(eq(attachments.id, id), eq(attachments.itemId, itemId))).get();
  if (!row) return;
  db.delete(attachments).where(and(eq(attachments.id, id), eq(attachments.itemId, itemId))).run();
  if (Platform.OS !== 'web') {
    const { File, Paths } = await import('expo-file-system');
    try { const file = new File(Paths.cache, attachmentCacheName(id, row.mimeType)); if (file.exists) file.delete(); } catch { /* OS may already have evicted the cached preview. */ }
  }
}
