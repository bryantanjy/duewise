import { count, desc, eq } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { router } from 'expo-router';
import ArchiveRestore from 'lucide-react-native/icons/archive-restore';
import ChevronLeft from 'lucide-react-native/icons/chevron-left';
import ExternalLink from 'lucide-react-native/icons/external-link';
import Trash from 'lucide-react-native/icons/trash';
import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import Card from '@/components/ui/Card';
import { db } from '@/db';
import { categories, items, reminders } from '@/db/schema';
import { deleteItem, restoreItem } from '@/services/items';
import { buildArchivedItemModel } from '@/utils/archived-item-model';
import { formatDateForDisplay } from '@/utils/item-form';
import { useTheme } from '@/hooks/use-theme';

const archivedItemsQuery = db
  .select({
    categoryColor: categories.color,
    categoryName: categories.name,
    id: items.id,
    importance: items.importance,
    name: items.name,
    reminderCount: count(reminders.id),
    repeatType: items.repeatType,
    targetDate: items.targetDate,
  })
  .from(items)
  .leftJoin(categories, eq(items.categoryId, categories.id))
  .leftJoin(reminders, eq(reminders.itemId, items.id))
  .where(eq(items.archived, true))
  .groupBy(
    items.id,
    items.name,
    items.importance,
    items.repeatType,
    items.targetDate,
    categories.name,
    categories.color,
  )
  .orderBy(desc(items.updatedAt));

export default function ArchivedItemsScreen() {
  const colors = useTheme();
  const { data, error } = useLiveQuery(archivedItemsQuery);
  const models = useMemo(() => data.map(buildArchivedItemModel), [data]);
  const [activeItemId, setActiveItemId] = useState<number>();
  const [activeAction, setActiveAction] = useState<'delete' | 'restore'>();
  const [actionError, setActionError] = useState<string>();

  async function handleRestore(itemId: number) {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setActiveItemId(itemId);
    setActiveAction('restore');
    setActionError(undefined);
    try {
      const result = await restoreItem(itemId);
      router.replace({
        pathname: '/item/[id]',
        params: {
          id: String(result.itemId),
          restored: '1',
          scheduled: String(result.scheduledReminderCount),
          skipped: String(result.skippedReminderCount),
        },
      });
    } catch (caughtError) {
      setActionError(caughtError instanceof Error ? caughtError.message : 'Unable to restore item.');
    } finally {
      setActiveItemId(undefined);
      setActiveAction(undefined);
    }
  }

  function confirmDelete(itemId: number, itemName: string) {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    Alert.alert(
      'Delete this item permanently?',
      `“${itemName}” and its renewal history will be removed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete permanently',
          style: 'destructive',
          onPress: async () => {
            setActiveItemId(itemId);
            setActiveAction('delete');
            setActionError(undefined);
            try {
              await deleteItem(itemId);
            } catch (caughtError) {
              setActionError(
                caughtError instanceof Error ? caughtError.message : 'Unable to delete item.',
              );
            } finally {
              setActiveItemId(undefined);
              setActiveAction(undefined);
            }
          },
        },
      ],
    );
  }

  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: colors.background }}>
      <View className="flex-row items-center justify-between px-5 py-3">
        <Pressable
          accessibilityLabel="Back to settings"
          accessibilityRole="button"
          className="h-10 flex-row items-center pr-3 active:opacity-70"
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
            router.back();
          }}>
          <ChevronLeft color={colors.primary} size={22} strokeWidth={2.2} />
          <Text className="text-sm font-bold text-app-primary">Settings</Text>
        </Pressable>
        <View className="rounded-full px-2.5 py-0.5" style={{ backgroundColor: colors.primarySoft }}>
          <Text className="text-xs font-bold text-app-primary">{models.length} archived</Text>
        </View>
      </View>

      <ScrollView contentContainerClassName="px-5 pb-16 pt-2" showsVerticalScrollIndicator={false}>
        <Text className="text-[11px] font-bold uppercase tracking-[1.5px] text-app-primary">
          Saved, Not Scheduled
        </Text>
        <Text className="mt-0.5 text-3xl font-extrabold tracking-tight text-app-text">Archived items</Text>
        <Text className="mt-1 text-xs leading-5 text-app-muted">
          Reminder days stay saved here. Restore an item whenever it becomes relevant again.
        </Text>

        {error ? (
          <Text selectable className="mt-6 rounded-2xl bg-app-danger-soft p-4 text-app-danger">
            {error.message}
          </Text>
        ) : null}
        {actionError ? (
          <Text selectable className="mt-4 rounded-2xl bg-app-danger-soft p-4 text-app-danger">
            {actionError}
          </Text>
        ) : null}

        {models.length === 0 ? (
          <Card className="mt-8 items-center p-8 text-center">
            <View
              className="h-14 w-14 items-center justify-center rounded-3xl"
              style={{ backgroundColor: colors.primarySoft }}>
              <ArchiveRestore color={colors.primary} size={26} />
            </View>
            <Text className="mt-4 text-xl font-bold text-app-text">Your archive is clear</Text>
            <Text className="mt-2 text-center text-xs leading-5 text-app-muted">
              Items you archive will appear here with their reminder-day settings intact.
            </Text>
          </Card>
        ) : (
          <View className="mt-6 gap-3.5">
            {models.map((item) => {
              const isActive = activeItemId === item.id;
              return (
                <Card className="p-5" key={item.id}>
                  <View className="flex-row items-start justify-between">
                    <View className="min-w-0 flex-1 pr-3">
                      <View className="flex-row items-center">
                        <View
                          className="mr-2 h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: item.categoryColor }}
                        />
                        <Text className="text-[11px] font-bold uppercase tracking-[1.2px] text-app-muted">
                          {item.categoryName}
                        </Text>
                      </View>
                      <Text className="mt-1.5 text-xl font-bold text-app-text" numberOfLines={2}>
                        {item.name}
                      </Text>
                    </View>
                    <Pressable
                      accessibilityLabel={`Permanently delete ${item.name}`}
                      accessibilityRole="button"
                      className="h-10 w-10 items-center justify-center rounded-xl active:opacity-70 disabled:opacity-40"
                      disabled={isActive}
                      onPress={() => confirmDelete(item.id, item.name)}
                      style={{ backgroundColor: colors.dangerSoft }}>
                      <Trash color={colors.danger} size={16} />
                    </Pressable>
                  </View>

                  <View
                    className="mt-4 rounded-2xl p-3"
                    style={{ backgroundColor: colors.surfaceInset }}>
                    <Text className="text-sm font-bold text-app-text">
                      {formatDateForDisplay(item.targetDate)}
                    </Text>
                    <Text className="mt-0.5 text-xs text-app-muted">{item.reminderLabel}</Text>
                  </View>

                  <View className="mt-4 flex-row gap-2.5">
                    <Pressable
                      accessibilityRole="button"
                      className="min-h-11 flex-1 flex-row items-center justify-center rounded-2xl border active:opacity-75 disabled:opacity-40"
                      disabled={isActive}
                      onPress={() => {
                        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                        router.push({ pathname: '/item/[id]', params: { id: String(item.id) } });
                      }}
                      style={{ borderColor: colors.border }}>
                      <ExternalLink color={colors.textSecondary} size={15} />
                      <Text className="ml-2 text-xs font-bold text-app-text">Details</Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      className="min-h-11 flex-1 flex-row items-center justify-center rounded-2xl active:opacity-75 disabled:opacity-40"
                      disabled={isActive}
                      onPress={() => handleRestore(item.id)}
                      style={{ backgroundColor: colors.primarySoft }}>
                      <ArchiveRestore color={colors.primary} size={16} />
                      <Text className="ml-2 text-xs font-bold text-app-primary">
                        {isActive && activeAction === 'restore' ? 'Restoring...' : 'Restore'}
                      </Text>
                    </Pressable>
                  </View>
                </Card>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

