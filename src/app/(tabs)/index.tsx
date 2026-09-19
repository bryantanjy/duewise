import { eq } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { router } from 'expo-router';
import ArrowRight from 'lucide-react-native/icons/arrow-right';
import Plus from 'lucide-react-native/icons/plus';
import Settings from 'lucide-react-native/icons/settings';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BrandMark from '@/components/brand/BrandMark';

import ItemRow, { type ItemRowData } from '@/components/items/ItemRow';
import { statusText } from '@/components/items/StatusBadge';
import { db } from '@/db';
import { categories, items } from '@/db/schema';
import { daysUntil, formatDay, formatMonth } from '@/utils/dates';
import { useTheme } from '@/hooks/use-theme';

const dashboardItemsQuery = db
  .select({
    categoryColor: categories.color,
    categoryName: categories.name,
    id: items.id,
    importance: items.importance,
    name: items.name,
    repeatType: items.repeatType,
    targetDate: items.targetDate,
  })
  .from(items)
  .leftJoin(categories, eq(items.categoryId, categories.id))
  .where(eq(items.archived, false))
  .orderBy(items.targetDate);

function openItem(item: ItemRowData) {
  router.push({ pathname: '/item/[id]', params: { id: String(item.id) } });
}

export default function HomeScreen() {
  const colors = useTheme();
  const { data, error } = useLiveQuery(dashboardItemsQuery);
  const overdueCount = data.filter((item) => daysUntil(item.targetDate) < 0).length;
  const upcomingCount = data.filter((item) => {
    const days = daysUntil(item.targetDate);
    return days >= 0 && days <= 30;
  }).length;
  const nextItem = data.find((item) => daysUntil(item.targetDate) >= 0) ?? data[0];
  const upcomingItems = data.filter((item) => item.id !== nextItem?.id).slice(0, 3);

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerClassName="px-5 pb-10 pt-5">
        <View className="flex-row items-center justify-between">
          <View className="flex-1 flex-row items-center">
            <BrandMark size={44} />
            <View className="ml-3 flex-1">
              <Text className="text-[11px] font-bold uppercase tracking-[2px] text-app-primary">
                Duewise
              </Text>
              <Text className="mt-0.5 text-xl font-bold tracking-tight text-app-text">
                Your dates, in hand.
              </Text>
            </View>
          </View>
          <Pressable
            accessibilityLabel="Settings"
            className="h-12 w-12 items-center justify-center rounded-2xl border border-app-border bg-app-surface active:bg-app-primary-soft"
            onPress={() => router.push('/settings')}>
            <Settings color={colors.text} size={21} />
          </Pressable>
        </View>

        <View className="mt-8">
          <Text className="text-xs font-bold uppercase tracking-[2px] text-app-muted">Your overview</Text>
          <Text className="mt-2 text-3xl font-bold tracking-tight text-app-text">Ahead of what matters.</Text>
          <Text className="mt-2 text-sm leading-6 text-app-muted">A calmer way to keep every important date close.</Text>
        </View>

        {error ? (
          <Text selectable className="mt-6 rounded-2xl bg-app-danger-soft p-4 text-app-danger">
            {error.message}
          </Text>
        ) : null}

        {nextItem ? (
          <Pressable
            className="mt-7 overflow-hidden rounded-[28px] bg-app-text p-6 active:opacity-90"
            onPress={() => openItem(nextItem)}>
            <View className="absolute -right-10 -top-12 h-48 w-48 rounded-full border border-white/10" />
            <View className="absolute -right-1 -top-2 h-32 w-32 rounded-full border border-white/10" />
            <View className="flex-row items-start justify-between">
              <View className="flex-1 pr-4">
                <Text className="text-[11px] font-bold uppercase tracking-[2px]" style={{ color: colors.heroAccent }}>
                  Next on your horizon
                </Text>
                <Text className="mt-5 text-[27px] font-bold leading-8 text-white" numberOfLines={2}>
                  {nextItem.name}
                </Text>
                <Text className="mt-2 text-sm" style={{ color: colors.heroMuted }}>
                  {nextItem.categoryName ?? 'Uncategorized'}
                </Text>
              </View>
              <View className="items-center rounded-2xl border border-white/15 bg-white/10 px-4 py-3">
                <Text className="text-[11px] font-bold tracking-wider" style={{ color: colors.heroAccent }}>
                  {formatMonth(nextItem.targetDate)}
                </Text>
                <Text className="mt-1 text-3xl font-bold text-white">
                  {formatDay(nextItem.targetDate)}
                </Text>
              </View>
            </View>
            <View className="mt-9 flex-row items-center justify-between border-t border-white/15 pt-4">
              <Text className="font-semibold text-white">{statusText(nextItem.targetDate)}</Text>
              <ArrowRight color="#FFFFFF" size={20} />
            </View>
          </Pressable>
        ) : (
          <View className="mt-7 rounded-[28px] border border-app-border bg-app-surface p-6">
            <Text className="text-2xl font-bold text-app-text">Your horizon is clear</Text>
            <Text className="mt-2 max-w-72 text-sm leading-6 text-app-muted">
              Add the first date you want Duewise to watch for you.
            </Text>
            <Pressable
              className="mt-6 self-start flex-row items-center rounded-2xl bg-app-primary px-5 py-3.5 active:opacity-80"
              onPress={() => router.push('/item/new')}>
              <Plus color="#FFFFFF" size={19} />
              <Text className="ml-2 font-semibold text-white">Add first item</Text>
            </Pressable>
          </View>
        )}

        <View className="mt-6 flex-row gap-3">
          <View className="flex-1 rounded-2xl border border-app-border bg-app-surface p-5">
            <View className="mb-3 h-1 w-8 rounded-full bg-app-primary" />
            <Text className="text-2xl font-bold text-app-text">{upcomingCount}</Text>
            <Text className="mt-1 text-xs font-medium text-app-muted">Next 30 days</Text>
          </View>
          <View className="flex-1 rounded-2xl border border-app-border bg-app-surface p-5">
            <View className="mb-3 h-1 w-8 rounded-full bg-app-danger-soft" />
            <Text className={overdueCount > 0 ? 'text-2xl font-bold text-app-danger' : 'text-2xl font-bold text-app-text'}>
              {overdueCount}
            </Text>
            <Text className="mt-1 text-xs font-medium text-app-muted">Overdue</Text>
          </View>
        </View>

        {upcomingItems.length > 0 ? (
          <View className="mt-8">
            <View className="mb-3 flex-row items-center justify-between">
              <Text className="text-lg font-bold text-app-text">Coming up</Text>
              <Pressable className="min-h-11 justify-center pl-4" onPress={() => router.push('/items')}>
                <Text className="text-sm font-semibold text-app-primary">View all</Text>
              </Pressable>
            </View>
            <View className="overflow-hidden rounded-2xl border border-app-border bg-app-surface">
              {upcomingItems.map((item, index) => (
                <ItemRow
                  item={item}
                  key={item.id}
                  onPress={() => openItem(item)}
                  showDivider={index > 0}
                />
              ))}
            </View>
          </View>
        ) : null}
      </ScrollView>

      {data.length > 0 ? (
        <Pressable
          accessibilityLabel="Add item"
          className="absolute bottom-5 right-5 h-14 w-14 items-center justify-center rounded-full bg-app-primary shadow-lg active:opacity-80"
          onPress={() => router.push('/item/new')}>
          <Plus color="#FFFFFF" size={24} />
        </Pressable>
      ) : null}
    </SafeAreaView>
  );
}
