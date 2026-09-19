import { and, desc, eq } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { router, useLocalSearchParams } from 'expo-router';
import Archive from 'lucide-react-native/icons/archive';
import ChevronLeft from 'lucide-react-native/icons/chevron-left';
import Pencil from 'lucide-react-native/icons/pencil';
import RefreshCw from 'lucide-react-native/icons/refresh-cw';
import Trash from 'lucide-react-native/icons/trash';
import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import StatusBadge from '@/components/items/StatusBadge';
import { db } from '@/db';
import { categories, itemHistory, items, reminders } from '@/db/schema';
import { archiveItem, deleteItem, renewItem, restoreItem } from '@/services/items';
import { buildRenewalHistoryModel } from '@/utils/item-history-model';

export default function ItemDetailsScreen() {
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
    <SafeAreaView className="flex-1 bg-app-bg" edges={['top', 'bottom']}>
      <View className="flex-row items-center justify-between px-4 py-2">
        <Pressable className="h-11 flex-row items-center pr-4" onPress={() => router.back()}>
          <ChevronLeft color="#635BFF" size={22} />
          <Text className="font-semibold text-app-primary">Back</Text>
        </Pressable>
        {!item.archived ? (
          <Pressable
            className="h-11 flex-row items-center pl-4"
            onPress={() => router.push({ pathname: '/item/new', params: { editId: String(item.id) } })}>
            <Pencil color="#635BFF" size={17} />
            <Text className="ml-2 font-semibold text-app-primary">Edit</Text>
          </Pressable>
        ) : <View className="h-11" />}
      </View>

      <ScrollView contentContainerClassName="px-5 pb-12 pt-2">
        {created === '1' || updated === '1' || renewed === '1' || restored === '1' ? (
          <View className="mb-5 rounded-2xl bg-app-success-soft p-4">
            <Text className="font-semibold text-app-success">
              {restored === '1'
                ? 'Item restored'
                : renewed === '1'
                  ? 'Renewed for another year'
                  : updated === '1'
                    ? 'Changes saved'
                    : 'Item saved'}
            </Text>
            <Text className="mt-1 text-sm leading-5 text-app-muted">
              {scheduledCount} {scheduledCount === 1 ? 'reminder' : 'reminders'} scheduled
              {skippedCount > 0 ? `; ${skippedCount} could not be scheduled` : ''}.
            </Text>
          </View>
        ) : null}

        <View className="flex-row items-center">
          <View
            className="mr-3 h-3 w-3 rounded-full"
            style={{ backgroundColor: item.categoryColor ?? '#737373' }}
          />
          <Text className="text-xs font-bold uppercase tracking-[1.5px] text-app-muted">
            {item.categoryName ?? 'Uncategorized'} · {item.dateType}
          </Text>
        </View>
        <Text className="mt-3 text-3xl font-bold tracking-tight text-app-text">{item.name}</Text>

        {item.archived ? (
          <View className="mt-5 rounded-2xl bg-app-warning-soft p-4">
            <Text className="font-semibold text-app-warning">Archived</Text>
            <Text className="mt-1 text-sm leading-5 text-app-muted">
              Reminder days are saved, but notifications are inactive until this item is restored.
            </Text>
          </View>
        ) : null}

        <View className="mt-7 rounded-3xl bg-app-text p-6">
          <Text className="text-xs font-bold uppercase tracking-[1.5px] text-[#B8B5FF]">Target date</Text>
          <View className="mt-3 flex-row items-end justify-between">
            <Text className="text-3xl font-bold text-white">{item.targetDate}</Text>
            <StatusBadge targetDate={item.targetDate} />
          </View>
          <Text className="mt-3 text-sm text-[#B7B7B7]">
            {item.repeatType === 'yearly' ? 'Renews yearly on the same month and day' : 'One-time date'}
          </Text>

          {!item.archived && item.repeatType === 'yearly' ? (
            <Pressable
              className="mt-6 min-h-12 flex-row items-center justify-center rounded-2xl bg-white active:opacity-80 disabled:opacity-50"
              disabled={Boolean(activeAction)}
              onPress={handleRenew}>
              <RefreshCw color="#171717" size={18} />
              <Text className="ml-2 font-semibold text-app-text">
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

        <View className="mt-6 rounded-2xl bg-app-surface p-5">
          <Text className="text-xs font-bold uppercase tracking-[1.5px] text-app-muted">Reminders</Text>
          {reminderRows.length > 0 ? (
            <View className="mt-3">
              {reminderRows
                .slice()
                .sort((left, right) => right.daysBefore - left.daysBefore)
                .map((reminder, index) => (
                  <View
                    className={`min-h-11 flex-row items-center justify-between ${index > 0 ? 'border-t border-app-border' : ''}`}
                    key={reminder.id}>
                    <Text className="text-app-text">
                      {reminder.daysBefore === 0
                        ? 'On the due date'
                        : `${reminder.daysBefore} ${reminder.daysBefore === 1 ? 'day' : 'days'} before`}
                    </Text>
                    <Text className={reminder.notificationId ? 'text-sm text-app-success' : 'text-sm text-app-muted'}>
                      {reminder.notificationId ? 'Scheduled' : 'Inactive'}
                    </Text>
                  </View>
                ))}
            </View>
          ) : (
            <Text className="mt-3 text-app-muted">No reminders configured.</Text>
          )}
        </View>

        <View className="mt-4 rounded-2xl bg-app-surface p-5">
          <View className="flex-row items-center justify-between">
            <Text className="text-xs font-bold uppercase tracking-[1.5px] text-app-muted">Importance</Text>
            <Text className="capitalize font-semibold text-app-text">{item.importance}</Text>
          </View>
          {item.notes ? (
            <View className="mt-4 border-t border-app-border pt-4">
              <Text className="text-xs font-bold uppercase tracking-[1.5px] text-app-muted">Notes</Text>
              <Text className="mt-2 leading-6 text-app-text">{item.notes}</Text>
            </View>
          ) : null}
        </View>

        {historyModels.length > 0 ? (
          <View className="mt-4 rounded-2xl bg-app-surface p-5">
            <Text className="text-xs font-bold uppercase tracking-[1.5px] text-app-muted">
              Renewal history
            </Text>
            <View className="mt-3">
              {historyModels.map((entry, index) => (
                <View
                  accessible
                  accessibilityLabel={`Renewed from ${entry.previousDate} to ${entry.newDate} on ${entry.changedAt}`}
                  className={`py-3 ${index > 0 ? 'border-t border-app-border' : ''}`}
                  key={entry.id}>
                  <Text className="font-semibold text-app-text">
                    {entry.previousDate} → {entry.newDate}
                  </Text>
                  <Text className="mt-1 text-sm text-app-muted">Renewed {entry.changedAt}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        <Text className="mb-2 mt-9 text-xs font-bold uppercase tracking-[1.5px] text-app-muted">
          Item management
        </Text>
        <View className="overflow-hidden rounded-2xl bg-app-surface">
          {item.archived ? (
            <Pressable
              className="min-h-14 flex-row items-center px-5 active:bg-app-primary-soft disabled:opacity-50"
              disabled={Boolean(activeAction)}
              onPress={handleRestore}>
              <RefreshCw color="#635BFF" size={19} />
              <Text className="ml-3 font-semibold text-app-primary">
                {activeAction === 'restore' ? 'Restoring...' : 'Restore item'}
              </Text>
            </Pressable>
          ) : (
            <Pressable
              className="min-h-14 flex-row items-center px-5 active:bg-app-primary-soft disabled:opacity-50"
              disabled={Boolean(activeAction)}
              onPress={confirmArchive}>
              <Archive color="#635BFF" size={19} />
              <Text className="ml-3 font-semibold text-app-primary">
                {activeAction === 'archive' ? 'Archiving...' : 'Archive item'}
              </Text>
            </Pressable>
          )}
          <Pressable
            className="min-h-14 flex-row items-center border-t border-app-border px-5 active:bg-app-danger-soft disabled:opacity-50"
            disabled={Boolean(activeAction)}
            onPress={confirmDelete}>
            <Trash color="#D84A4A" size={19} />
            <Text className="ml-3 font-semibold text-app-danger">
              {activeAction === 'delete' ? 'Deleting...' : 'Delete permanently'}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
