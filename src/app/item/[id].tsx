import { and, desc, eq } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { router, useLocalSearchParams } from 'expo-router';
import ChevronLeft from 'lucide-react-native/icons/chevron-left';
import { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ItemDetailsContent, { type DetailAction } from '@/components/items/ItemDetailsContent';
import { useReminderStatus } from '@/hooks/use-reminder-status';
import { useTheme } from '@/hooks/use-theme';
import { nextScheduledReminder } from '@/utils/reminder-status';
import { formatDateForDisplay } from '@/utils/item-form';
import { reminderDateFor } from '@/utils/reminder-time';
import { buildRenewalHistoryModel } from '@/utils/item-history-model';
import { db } from '@/db';
import { categories, itemHistory, items, reminders } from '@/db/schema';
import { archiveItem, completeItem, deleteItem, renewItem, restoreItem, rescheduleItem, snoozeItem } from '@/services/items';

export default function ItemDetailsScreen() {
  const colors = useTheme();
  const { created, id, renewed, restored, scheduled, skipped, updated } = useLocalSearchParams<{
    created?: string;
    id: string;
    renewed?: string;
    restored?: string;
    scheduled?: string;
    skipped?: string;
    updated?: string;
  }>();
  const [actionError, setActionError] = useState<string>();
  const [activeAction, setActiveAction] = useState<DetailAction>();
  const actionLock = useRef(false);
  const [feedback, setFeedback] = useState<string>();
  const [checkVersion, setCheckVersion] = useState(0);
  const itemId = Number(id);
  const safeItemId = Number.isSafeInteger(itemId) && itemId > 0 ? itemId : -1;
  const itemQuery = useMemo(
    () =>
      db
        .select({
          categoryColor: categories.color,
          categoryName: categories.name,
          archived: items.archived,
          dateType: items.dateType,
          id: items.id,
          importance: items.importance,
          name: items.name,
          notes: items.notes,
          repeatType: items.repeatType,
          repeatInterval: items.repeatInterval,
          targetDate: items.targetDate,
          reminderTime: items.reminderTime,
        })
        .from(items)
        .leftJoin(categories, eq(items.categoryId, categories.id))
        .where(eq(items.id, safeItemId)),
    [safeItemId],
  );
  const reminderQuery = useMemo(
    () =>
      db
        .select()
        .from(reminders)
        .where(eq(reminders.itemId, safeItemId))
        .orderBy(reminders.daysBefore),
    [safeItemId],
  );
  const historyQuery = useMemo(
    () =>
      db
        .select({
          action: itemHistory.action,
          createdAt: itemHistory.createdAt,
          id: itemHistory.id,
          newDate: itemHistory.newDate,
          previousDate: itemHistory.previousDate,
        })
        .from(itemHistory)
        .where(and(eq(itemHistory.itemId, safeItemId), eq(itemHistory.action, 'renewed')))
        .orderBy(desc(itemHistory.createdAt)),
    [safeItemId],
  );
  const { data, error, updatedAt } = useLiveQuery(itemQuery);
  const { data: reminderRows } = useLiveQuery(reminderQuery);
  const { data: historyRows } = useLiveQuery(historyQuery);
  const historyModels = useMemo(
    () => historyRows.map((row) => buildRenewalHistoryModel(row)).filter((entry) => entry !== undefined),
    [historyRows],
  );
  const item = data[0];
  const rawDeviceStatus = useReminderStatus(reminderRows.map((row) => row.notificationId).join(','), checkVersion);
  const deviceStatus = rawDeviceStatus && { ...rawDeviceStatus, notifications: rawDeviceStatus.notifications.map((entry) => {
    const row = reminderRows.find((reminder) => reminder.notificationId === entry.id);
    return { ...entry, scheduledFor: entry.scheduledFor ?? (item && row && !row.isSnooze
      ? reminderDateFor(item.targetDate, row.daysBefore, item.reminderTime).toISOString() : undefined) };
  }) };
  const nextReminder = nextScheduledReminder(deviceStatus, reminderRows.map((row) => row.notificationId));

  if (error || !item) {
    const loading = !error && !updatedAt && safeItemId > 0;
    return <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, padding: 22, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.homeBackground }}>
      {loading ? <ActivityIndicator color={colors.primary} /> : null}
      <Text style={{ marginTop: 12, fontSize: 18, lineHeight: 27, color: error ? colors.danger : colors.text }}>{error ? 'Unable to load reminder' : loading ? 'Loading reminder...' : 'Reminder not found'}</Text>
      {error ? <Text selectable style={{ marginTop: 10, fontSize: 13, color: colors.textSecondary }}>{error.message}</Text> : null}
      <Pressable accessibilityRole="button" onPress={() => router.back()} style={{ minHeight: 48, justifyContent: 'center', paddingHorizontal: 18, marginTop: 18 }}>
        <Text style={{ color: colors.primary, fontSize: 14 }}>Go back</Text>
      </Pressable>
    </SafeAreaView>;
  }

  async function runAction(action: DetailAction, work: () => Promise<void>) {
    if (actionLock.current) return;
    actionLock.current = true;
    setActiveAction(action);
    setActionError(undefined);
    setFeedback(undefined);
    try { await work(); }
    catch (error) { setActionError(error instanceof Error ? error.message : 'Unable to complete this action. Please try again.'); }
    finally { actionLock.current = false; setActiveAction(undefined); }
  }

  const edit = (section?: 'schedule') => router.push({ pathname: '/item/new', params: { editId: String(item.id), ...(section ? { section } : {}) } });
  function handleComplete() {
    if (item.repeatType !== 'none') {
      void runAction('complete', async () => {
        const result = await renewItem(item.id);
        const renewedItem = db.select({ targetDate: items.targetDate }).from(items).where(eq(items.id, item.id)).get();
        setFeedback(`Completed.${renewedItem ? ` Next due ${formatDateForDisplay(renewedItem.targetDate)}.` : ''} ${result.scheduledReminderCount} ${result.scheduledReminderCount === 1 ? 'alert' : 'alerts'} scheduled.${result.skippedReminderCount ? ` ${result.skippedReminderCount} alert times were skipped. Check the notification status below.` : ''}`);
        setCheckVersion(value => value + 1);
      });
    } else {
      Alert.alert('Mark this reminder done?', 'It will move to the archive and its remaining alerts will be cancelled.', [
        { text: 'Cancel', style: 'cancel' }, { text: 'Mark done', onPress: () => { void runAction('complete', async () => {
          await completeItem(item.id, item.targetDate);
          setFeedback('Completed. This reminder is now archived. You can restore it here if needed.');
          setCheckVersion(value => value + 1);
        }); } },
      ]);
    }
  }
  function confirmArchive() {
    Alert.alert('Archive this reminder?', 'Its scheduled alerts will be cancelled. You can restore it later.', [
      { text: 'Cancel', style: 'cancel' }, { text: 'Archive', onPress: () => { void runAction('archive', async () => {
        await archiveItem(item.id); router.replace('/archived');
      }); } },
    ]);
  }
  function confirmDelete() {
    Alert.alert('Delete permanently?', 'This removes the reminder and its history, and cancels its alerts.', [
      { text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => { void runAction('delete', async () => {
        await deleteItem(item.id); router.replace(item.archived ? '/archived' : '/items');
      }); } },
    ]);
  }
  function handleRestore() {
    void runAction('restore', async () => {
      const result = await restoreItem(item.id);
      router.replace({ pathname: '/item/[id]', params: { id: String(item.id), restored: '1',
        scheduled: String(result.scheduledReminderCount), skipped: String(result.skippedReminderCount) } });
    });
  }
  function handleSnooze() {
    void runAction('snooze', async () => {
      await snoozeItem(item.id, item.targetDate, `manual_${item.id}_${Date.now()}`);
      setFeedback('Snoozed. An extra alert is scheduled in 1 hour.');
    });
  }
  function handleRefresh() {
    void runAction('refresh', async () => {
      const result = await rescheduleItem(item.id);
      setFeedback(`${result.scheduledReminderCount} alerts scheduled.${result.skippedReminderCount ? ` ${result.skippedReminderCount} alerts were skipped because their times have passed or permission is unavailable.` : ''}`);
    });
  }
  const saved = created === '1' || updated === '1' || renewed === '1' || restored === '1';
  const savedMessage = saved ? `${restored === '1' ? 'Reminder restored.' : renewed === '1' ? `Completed. Next due ${formatDateForDisplay(item.targetDate)}.` : updated === '1' ? 'Changes saved.' : 'Reminder saved.'} ${Number(scheduled ?? 0)} alerts scheduled.${Number(skipped ?? 0) > 0 ? ` ${Number(skipped)} alert times were skipped. Check the notification status below.` : ''}` : undefined;

  return <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: colors.homeBackground }}>
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 8, paddingBottom: 32 }}>
      <View style={{ width: '100%', maxWidth: 640, alignSelf: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.back()}
            style={({ pressed }) => ({ minHeight: 48, paddingRight: 18, flexDirection: 'row', alignItems: 'center', gap: 4, opacity: pressed ? 0.6 : 1 })}>
            <ChevronLeft color={colors.textSecondary} size={20} strokeWidth={1.7} />
            <Text style={{ fontSize: 14, color: colors.textSecondary }}>Back</Text>
          </Pressable>
          <Text style={{ fontSize: 12, color: colors.textSecondary }}>Reminder details</Text>
        </View>
        <ItemDetailsContent item={item} reminders={reminderRows} history={historyModels} deviceStatus={deviceStatus}
          nextReminder={nextReminder} activeAction={activeAction} error={actionError} message={feedback ?? savedMessage}
          onComplete={handleComplete} onRestore={handleRestore} onEdit={() => edit()} onReschedule={() => edit('schedule')}
          onCheckSchedule={() => setCheckVersion(value => value + 1)} onSnooze={handleSnooze} onRefresh={handleRefresh} onArchive={confirmArchive} onDelete={confirmDelete}
          onSettings={() => { void Linking.openSettings().catch(() => setActionError('Open device settings to enable notifications.')); }} />
      </View>
    </ScrollView>
  </SafeAreaView>;
}
