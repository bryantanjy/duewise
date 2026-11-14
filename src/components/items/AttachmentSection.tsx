import { eq } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, Text, View } from 'react-native';
import { db } from '@/db';
import { attachments } from '@/db/schema';
import { useTheme } from '@/hooks/use-theme';
import { MAX_ATTACHMENTS_PER_ITEM } from '@/utils/attachments';

export default function AttachmentSection({ itemId }: { itemId: number }) {
  const colors = useTheme();
  const query = useMemo(() => db.select({ id: attachments.id, name: attachments.name, size: attachments.size })
    .from(attachments).where(eq(attachments.itemId, itemId)).orderBy(attachments.id), [itemId]);
  const { data, error, updatedAt } = useLiveQuery(query);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [message, setMessage] = useState<string>();
  const [actionError, setActionError] = useState<string>();
  if (Platform.OS === 'web') return null;
  async function run(work: () => Promise<void>) {
    if (lock.current) return;
    lock.current = true; setBusy(true); setActionError(undefined); setMessage(undefined);
    try { await work(); } catch (caught) { setActionError(caught instanceof Error ? caught.message : 'Unable to update attachments.'); }
    finally { lock.current = false; setBusy(false); }
  }
  const buttonStyle = { minHeight: 48, paddingHorizontal: 10, justifyContent: 'center' as const };
  return <View style={{ marginTop: 26 }}>
    <Text accessibilityRole="header" style={{ fontSize: 17, lineHeight: 25, fontWeight: '600', color: colors.text }}>Attachments</Text>
    <Text style={{ marginTop: 6, marginBottom: 12, color: colors.textSecondary, fontSize: 12, lineHeight: 19 }}>PDFs and images: up to 5 files per reminder, 5 MB each (25 MB total). Included in backups.</Text>
    <View style={{ backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 16, padding: 14 }}>
      {!updatedAt && !error ? <ActivityIndicator color={colors.primary} /> : !data.length ? <Text style={{ color: colors.textSecondary, fontSize: 13, lineHeight: 21 }}>No documents attached yet.</Text> : null}
      {data.map(row => <View key={row.id} style={{ paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <Text style={{ fontSize: 14, lineHeight: 22, fontWeight: '500', color: colors.text }}>{row.name}</Text>
        <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 2 }}>{Math.max(1, Math.round(row.size / 1024))} KB</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          <Pressable accessibilityRole="button" accessibilityLabel={`Open or share ${row.name}`} disabled={busy} accessibilityState={{ disabled: busy }} style={buttonStyle}
            onPress={() => { void run(async () => { const service = await import('@/services/attachments'); await service.shareAttachment(itemId, row.id); }); }}>
            <Text style={{ color: colors.primary, fontSize: 13 }}>Open / share</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${row.name}`} disabled={busy} accessibilityState={{ disabled: busy }} style={buttonStyle}
            onPress={() => Alert.alert('Remove attachment?', `Remove “${row.name}” from this reminder? The original file is kept.`, [
              { text: 'Cancel', style: 'cancel' }, { text: 'Remove', style: 'destructive', onPress: () => { void run(async () => {
                const service = await import('@/services/attachments'); await service.removeAttachment(itemId, row.id); setMessage('Attachment removed.');
              }); } },
            ])}>
            <Text style={{ color: colors.danger, fontSize: 13 }}>Remove</Text>
          </Pressable>
        </View>
      </View>)}
      <Pressable accessibilityRole="button" disabled={busy || Boolean(error) || data.length >= MAX_ATTACHMENTS_PER_ITEM}
        accessibilityState={{ disabled: busy || Boolean(error) || data.length >= MAX_ATTACHMENTS_PER_ITEM, busy }}
        style={({ pressed }) => ({ marginTop: 10, minHeight: 48, padding: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft, opacity: busy || error || data.length >= MAX_ATTACHMENTS_PER_ITEM ? 0.5 : pressed ? 0.7 : 1 })}
        onPress={() => { void run(async () => { const service = await import('@/services/attachments'); if (await service.addAttachment(itemId)) setMessage('Attachment saved on this phone.'); }); }}>
        {busy ? <ActivityIndicator color={colors.primary} /> : <Text style={{ fontSize: 13, fontWeight: '500', color: colors.primary }}>{data.length >= MAX_ATTACHMENTS_PER_ITEM ? '5 attachments added' : 'Add document'}</Text>}
      </Pressable>
      {message ? <Text accessibilityLiveRegion="polite" style={{ marginTop: 10, color: colors.textSecondary, fontSize: 13 }}>{message}</Text> : null}
      {actionError || error ? <Text accessibilityRole="alert" selectable style={{ marginTop: 10, fontSize: 13, color: colors.danger }}>{actionError ?? 'Unable to load attachments. Reopen this reminder to retry.'}</Text> : null}
    </View>
  </View>;
}
