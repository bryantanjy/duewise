import { and, desc, eq } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { router, useLocalSearchParams } from 'expo-router';
import Archive from 'lucide-react-native/icons/archive';
import Bell from 'lucide-react-native/icons/bell';
import Calendar from 'lucide-react-native/icons/calendar';
import ChevronLeft from 'lucide-react-native/icons/chevron-left';
import FileText from 'lucide-react-native/icons/file-text';
import ClockArrowLeft from 'lucide-react-native/icons/clock-arrow-left';
import Pencil from 'lucide-react-native/icons/pencil';
import RefreshCw from 'lucide-react-native/icons/refresh-cw';
import Tag from 'lucide-react-native/icons/tag';
import Trash from 'lucide-react-native/icons/trash';
import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import Countdown from '@/components/items/Countdown';
import StatusBadge from '@/components/items/StatusBadge';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { db } from '@/db';
import { categories, itemHistory, items, reminders } from '@/db/schema';
import { archiveItem, deleteItem, renewItem, restoreItem } from '@/services/items';
import { buildRenewalHistoryModel } from '@/utils/item-history-model';
import { useTheme } from '@/hooks/use-theme';

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
  const [activeAction, setActiveAction] = useState<'archive' | 'delete' | 'renew' | 'restore'>();
  const itemId = Number(id);
  const safeItemId = Number.isInteger(itemId) ? itemId : -1;
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
          targetDate: items.targetDate,
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
  const { data, error } = useLiveQuery(itemQuery);
  const { data: reminderRows } = useLiveQuery(reminderQuery);
  const { data: historyRows } = useLiveQuery(historyQuery);
  const historyModels = useMemo(
    () => historyRows.map((row) => buildRenewalHistoryModel(row)).filter((entry) => entry !== undefined),
    [historyRows],
  );
  const item = data[0];

  if (error) {
    return (
      <View className="flex-1 items-center justify-center bg-app-bg px-6">
        <Text className="text-xl font-bold text-app-danger">Unable to load item</Text>
        <Text selectable className="mt-3 text-center text-app-muted">{error.message}</Text>
      </View>
    );
  }

  if (!item) {
    return (
      <View className="flex-1 items-center justify-center bg-app-bg px-6">
        <Text className="text-xl font-bold text-app-text">Item not found</Text>
        <Pressable className="mt-5 px-5 py-3" onPress={() => router.back()}>
          <Text className="font-semibold text-app-primary">Go back</Text>
        </Pressable>
      </View>
    );
  }

  const scheduledCount = Number(scheduled ?? 0);
  const skippedCount = Number(skipped ?? 0);

  async function handleRenew() {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setActionError(undefined);
    setActiveAction('renew');
    try {
      const result = await renewItem(item.id);
      router.replace({
        pathname: '/item/[id]',
        params: {
          id: String(item.id),
          renewed: '1',
          scheduled: String(result.scheduledReminderCount),
          skipped: String(result.skippedReminderCount),
        },
      });
    } catch (caughtError) {
      setActionError(caughtError instanceof Error ? caughtError.message : 'Unable to renew item.');
    } finally {
      setActiveAction(undefined);
    }
  }

  async function handleRestore() {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setActionError(undefined);
    setActiveAction('restore');
    try {
      const result = await restoreItem(item.id);
      router.replace({
        pathname: '/item/[id]',
        params: {
          id: String(item.id),
          restored: '1',
          scheduled: String(result.scheduledReminderCount),
          skipped: String(result.skippedReminderCount),
        },
      });
    } catch (caughtError) {
      setActionError(caughtError instanceof Error ? caughtError.message : 'Unable to restore item.');
    } finally {
      setActiveAction(undefined);
    }
  }

  function confirmArchive() {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    Alert.alert('Archive this item?', 'Its scheduled reminders will be cancelled.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Archive',
        onPress: async () => {
          setActiveAction('archive');
          try {
            await archiveItem(item.id);
            router.replace('/archived');
          } catch (caughtError) {
            setActionError(caughtError instanceof Error ? caughtError.message : 'Unable to archive item.');
            setActiveAction(undefined);
          }
        },
      },
    ]);
  }

  function confirmDelete() {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    Alert.alert('Delete this item?', 'This removes its history and cancels all reminders.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setActiveAction('delete');
          try {
            await deleteItem(item.id);
            router.replace(item.archived ? '/archived' : '/items');
          } catch (caughtError) {
            setActionError(caughtError instanceof Error ? caughtError.message : 'Unable to delete item.');
            setActiveAction(undefined);
          }
        },
      },
    ]);
  }

  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Top Navigation Bar */}
      <View className="flex-row items-center justify-between px-5 py-3">
        <Pressable
          accessibilityLabel="Go back"
          accessibilityRole="button"
          className="h-10 flex-row items-center pr-3 active:opacity-70"
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
            router.back();
          }}>
          <ChevronLeft color={colors.primary} size={22} strokeWidth={2.2} />
          <Text className="text-sm font-bold text-app-primary">Back</Text>
        </Pressable>

        {!item.archived ? (
          <Pressable
            accessibilityLabel="Edit item"
            accessibilityRole="button"
            className="flex-row items-center rounded-2xl px-3.5 py-2 active:opacity-75"
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
              router.push({ pathname: '/item/new', params: { editId: String(item.id) } });
            }}
            style={{ backgroundColor: colors.primarySoft }}>
            <Pencil color={colors.primary} size={15} strokeWidth={2.2} />
            <Text className="ml-1.5 text-xs font-bold text-app-primary">Edit</Text>
          </Pressable>
        ) : null}
      </View>

      <ScrollView contentContainerClassName="px-5 pb-16 pt-2" showsVerticalScrollIndicator={false}>
        {/* Notification Status Banner */}
        {created === '1' || updated === '1' || renewed === '1' || restored === '1' ? (
          <Card className="mb-5 p-4" style={{ backgroundColor: colors.successSoft, borderColor: colors.success }}>
            <Text className="font-bold text-app-success">
              {restored === '1'
                ? 'Item restored'
                : renewed === '1'
                  ? 'Renewed for another year'
                  : updated === '1'
                    ? 'Changes saved'
                    : 'Item saved'}
            </Text>
            <Text className="mt-1 text-xs leading-5 text-app-muted">
              {scheduledCount} {scheduledCount === 1 ? 'reminder' : 'reminders'} scheduled
              {skippedCount > 0 ? `; ${skippedCount} could not be scheduled` : ''}.
            </Text>
          </Card>
        ) : null}

        {/* Category Pill & Item Title */}
        <View className="flex-row items-center">
          <View
            className="mr-2 h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: item.categoryColor ?? colors.textSecondary }}
          />
          <Text className="text-xs font-bold uppercase tracking-[1.5px] text-app-muted">
            {item.categoryName ?? 'Uncategorized'} · {item.dateType}
          </Text>
        </View>
        <Text className="mt-2 text-3xl font-extrabold tracking-tight text-app-text">
          {item.name}
        </Text>

        {item.archived ? (
          <Card className="mt-4 p-4" style={{ backgroundColor: colors.warningSoft, borderColor: colors.warning }}>
            <Text className="font-bold text-app-warning">Archived Item</Text>
            <Text className="mt-1 text-xs leading-5 text-app-muted">
              Reminders are paused while this item is in the archive. Restore it anytime to resume notifications.
            </Text>
          </Card>
        ) : null}

        {/* Featured Countdown Hero Card */}
        <View
          className="mt-6 overflow-hidden rounded-[28px] p-6"
          style={{
            backgroundColor: colors.hero,
            shadowColor: colors.primary,
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.18,
            shadowRadius: 16,
            elevation: 6,
          }}>
          <View className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full border border-white/10" />
          <View className="pointer-events-none absolute -right-2 -top-2 h-28 w-28 rounded-full border border-white/10" />

          <View className="flex-row items-center justify-between">
            <View className="flex-1 pr-4">
              <Text className="text-[11px] font-bold uppercase tracking-[1.5px]" style={{ color: colors.heroAccent }}>
                Target Date
              </Text>
              <Text className="mt-2 text-3xl font-extrabold text-white" style={{ fontVariant: ['tabular-nums'] }}>
                {item.targetDate}
              </Text>
              <Text className="mt-1.5 text-xs font-medium" style={{ color: colors.heroMuted }}>
                {item.repeatType === 'yearly'
                  ? 'Renews yearly on the same day'
                  : 'One-time milestone'}
              </Text>
            </View>

            <View className="rounded-2xl border border-white/15 bg-white/10 p-2.5">
              <Countdown size={68} strokeWidth={5.5} targetDate={item.targetDate} />
            </View>
          </View>

          {!item.archived && item.repeatType === 'yearly' ? (
            <Pressable
              accessibilityRole="button"
              className="mt-6 min-h-12 flex-row items-center justify-center rounded-2xl bg-white active:opacity-85 disabled:opacity-50"
              disabled={Boolean(activeAction)}
              onPress={handleRenew}
              style={{
                shadowColor: '#000000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
              }}>
              <RefreshCw color={colors.hero} size={16} strokeWidth={2.2} />
              <Text className="ml-2 font-bold" style={{ color: colors.hero }}>
                {activeAction === 'renew' ? 'Renewing...' : 'Renew for next year'}
              </Text>
            </Pressable>
          ) : null}
        </View>

        {actionError ? (
          <Text selectable className="mt-4 rounded-2xl bg-app-danger-soft p-4 text-app-danger">
            {actionError}
          </Text>
        ) : null}

        {/* Bento: Reminders Schedule */}
        <Text className="mb-2.5 mt-8 text-xs font-bold uppercase tracking-[1.5px] text-app-muted">
          Reminders
        </Text>
        <Card className="p-4">
          <View className="mb-3 flex-row items-center">
            <View
              className="h-8 w-8 items-center justify-center rounded-xl"
              style={{ backgroundColor: colors.primarySoft }}>
              <Bell color={colors.primary} size={16} />
            </View>
            <Text className="ml-3 text-sm font-bold text-app-text">Notification schedule</Text>
          </View>

          {reminderRows.length > 0 ? (
            <View>
              {reminderRows
                .slice()
                .sort((left, right) => right.daysBefore - left.daysBefore)
                .map((reminder, index) => (
                  <View
                    className={`flex-row items-center justify-between py-3 ${
                      index > 0 ? 'border-t border-app-border' : ''
                    }`}
                    key={reminder.id}>
                    <Text className="text-sm font-semibold text-app-text">
                      {reminder.daysBefore === 0
                        ? 'On the due date'
                        : `${reminder.daysBefore} ${reminder.daysBefore === 1 ? 'day' : 'days'} before`}
                    </Text>
                    <View className="flex-row items-center">
                      <View
                        className="mr-2 h-2 w-2 rounded-full"
                        style={{
                          backgroundColor: reminder.notificationId
                            ? colors.success
                            : colors.textSecondary,
                        }}
                      />
                      <Text
                        className="text-xs font-semibold"
                        style={{
                          color: reminder.notificationId ? colors.success : colors.textSecondary,
                        }}>
                        {reminder.notificationId ? 'Scheduled' : 'Inactive'}
                      </Text>
                    </View>
                  </View>
                ))}
            </View>
          ) : (
            <Text className="py-2 text-xs text-app-muted">No reminders configured for this item.</Text>
          )}
        </Card>

        {/* Bento: Details & Specs */}
        <Text className="mb-2.5 mt-6 text-xs font-bold uppercase tracking-[1.5px] text-app-muted">
          Specifications
        </Text>
        <Card className="p-4">
          <View className="flex-row items-center justify-between py-1.5">
            <View className="flex-row items-center">
              <Tag color={colors.textSecondary} size={16} />
              <Text className="ml-2.5 text-sm font-semibold text-app-muted">Category</Text>
            </View>
            <Text className="text-sm font-bold text-app-text">{item.categoryName ?? 'Uncategorized'}</Text>
          </View>

          <View className="my-2 border-t border-app-border" />

          <View className="flex-row items-center justify-between py-1.5">
            <View className="flex-row items-center">
              <Calendar color={colors.textSecondary} size={16} />
              <Text className="ml-2.5 text-sm font-semibold text-app-muted">Date Type</Text>
            </View>
            <Text className="capitalize text-sm font-bold text-app-text">{item.dateType}</Text>
          </View>

          <View className="my-2 border-t border-app-border" />

          <View className="flex-row items-center justify-between py-1.5">
            <View className="flex-row items-center">
              <View
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: item.importance === 'high' ? colors.danger : colors.primary }}
              />
              <Text className="ml-2.5 text-sm font-semibold text-app-muted">Priority</Text>
            </View>
            <Text
              className="capitalize text-sm font-bold"
              style={{ color: item.importance === 'high' ? colors.danger : colors.text }}>
              {item.importance}
            </Text>
          </View>
        </Card>

        {/* Bento: Notes */}
        {item.notes ? (
          <View className="mt-6">
            <Text className="mb-2.5 text-xs font-bold uppercase tracking-[1.5px] text-app-muted">
              Notes
            </Text>
            <Card className="p-4">
              <View className="mb-2 flex-row items-center">
                <FileText color={colors.primary} size={16} />
                <Text className="ml-2 text-xs font-bold uppercase tracking-wider text-app-primary">
                  Attached details
                </Text>
              </View>
              <Text className="text-sm leading-6 text-app-text">{item.notes}</Text>
            </Card>
          </View>
        ) : null}

        {/* Bento: Renewal History */}
        {historyModels.length > 0 ? (
          <View className="mt-6">
            <Text className="mb-2.5 text-xs font-bold uppercase tracking-[1.5px] text-app-muted">
              Renewal History
            </Text>
            <Card className="p-4">
              <View className="mb-3 flex-row items-center">
                <ClockArrowLeft color={colors.primary} size={16} />
                <Text className="ml-2.5 text-sm font-bold text-app-text">Past renewals</Text>
              </View>
              {historyModels.map((entry, index) => (
                <View
                  accessible
                  accessibilityLabel={`Renewed from ${entry.previousDate} to ${entry.newDate} on ${entry.changedAt}`}
                  className={`py-3 ${index > 0 ? 'border-t border-app-border' : ''}`}
                  key={entry.id}>
                  <Text className="font-bold text-app-text">
                    {entry.previousDate} → {entry.newDate}
                  </Text>
                  <Text className="mt-0.5 text-xs text-app-muted">Renewed on {entry.changedAt}</Text>
                </View>
              ))}
            </Card>
          </View>
        ) : null}

        {/* Management Actions */}
        <Text className="mb-2.5 mt-9 text-xs font-bold uppercase tracking-[1.5px] text-app-muted">
          Manage Item
        </Text>
        <Card className="overflow-hidden p-0">
          {item.archived ? (
            <Pressable
              accessibilityRole="button"
              className="min-h-14 flex-row items-center px-5 active:opacity-75 disabled:opacity-50"
              disabled={Boolean(activeAction)}
              onPress={handleRestore}>
              <RefreshCw color={colors.primary} size={18} strokeWidth={2} />
              <Text className="ml-3.5 font-bold text-app-primary">
                {activeAction === 'restore' ? 'Restoring...' : 'Restore item to active'}
              </Text>
            </Pressable>
          ) : (
            <Pressable
              accessibilityRole="button"
              className="min-h-14 flex-row items-center px-5 active:opacity-75 disabled:opacity-50"
              disabled={Boolean(activeAction)}
              onPress={confirmArchive}>
              <Archive color={colors.primary} size={18} strokeWidth={2} />
              <Text className="ml-3.5 font-bold text-app-primary">
                {activeAction === 'archive' ? 'Archiving...' : 'Archive item'}
              </Text>
            </Pressable>
          )}

          <Pressable
            accessibilityRole="button"
            className="min-h-14 flex-row items-center border-t border-app-border px-5 active:opacity-75 disabled:opacity-50"
            disabled={Boolean(activeAction)}
            onPress={confirmDelete}>
            <Trash color={colors.danger} size={18} strokeWidth={2} />
            <Text className="ml-3.5 font-bold text-app-danger">
              {activeAction === 'delete' ? 'Deleting...' : 'Delete permanently'}
            </Text>
          </Pressable>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
