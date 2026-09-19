import { eq } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { router } from 'expo-router';
import ArrowRight from 'lucide-react-native/icons/arrow-right';
import Plus from 'lucide-react-native/icons/plus';
import Settings from 'lucide-react-native/icons/settings';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import ItemRow, { type ItemRowData } from '@/components/items/ItemRow';
import { statusText } from '@/components/items/StatusBadge';
import { db } from '@/db';
import { categories, items } from '@/db/schema';
import { daysUntil, formatDay, formatMonth } from '@/utils/dates';

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
  const { data, error } = useLiveQuery(dashboardItemsQuery);
  const overdueCount = data.filter((item) => daysUntil(item.targetDate) < 0).length;
  const upcomingCount = data.filter((item) => {
    const days = daysUntil(item.targetDate);
    return days >= 0 && days <= 30;
  }).length;
  const nextItem = data.find((item) => daysUntil(item.targetDate) >= 0) ?? data[0];
  const upcomingItems = data.filter((item) => item.id !== nextItem?.id).slice(0, 3);

  return (
    <SafeAreaView className="flex-1 bg-app-bg" edges={['top']}>
      <ScrollView contentContainerClassName="px-5 pb-10 pt-4">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-xs font-bold uppercase tracking-[2px] text-app-primary">
              Duewise
            </Text>
            <Text className="mt-1 text-3xl font-bold tracking-tight text-app-text">
              What needs attention
            </Text>
          </View>
          <Pressable
            accessibilityLabel="Settings"
            className="h-12 w-12 items-center justify-center rounded-full bg-app-surface active:bg-app-primary-soft"
            onPress={() => router.push('/settings')}>
            <Settings color="#4B4B4B" size={21} />
          </Pressable>
        </View>

        {error ? (
          <Text selectable className="mt-6 rounded-2xl bg-app-danger-soft p-4 text-app-danger">
            {error.message}
          </Text>
        ) : null}

        {nextItem ? (
          <Pressable
            className="mt-7 overflow-hidden rounded-3xl bg-app-text p-6 active:opacity-90"
            onPress={() => openItem(nextItem)}>
            <View className="flex-row items-start justify-between">
              <View>
                <Text className="text-xs font-bold uppercase tracking-[1.5px] text-[#B8B5FF]">
                  Next on your horizon
                </Text>
                <Text className="mt-3 max-w-64 text-2xl font-bold text-white" numberOfLines={2}>
                  {nextItem.name}
                </Text>
                <Text className="mt-2 text-sm text-[#B7B7B7]">
                  {nextItem.categoryName ?? 'Uncategorized'}
                </Text>
              </View>
              <View className="items-center rounded-2xl bg-white/10 px-4 py-3">
                <Text className="text-[11px] font-bold tracking-wider text-[#B8B5FF]">
                  {formatMonth(nextItem.targetDate)}
                </Text>
                <Text className="mt-1 text-3xl font-bold text-white">
                  {formatDay(nextItem.targetDate)}
                </Text>
              </View>
            </View>
            <View className="mt-7 flex-row items-center justify-between border-t border-white/10 pt-4">
              <Text className="font-semibold text-white">{statusText(nextItem.targetDate)}</Text>
              <ArrowRight color="#FFFFFF" size={20} />
            </View>
          </Pressable>
        ) : (
          <View className="mt-7 rounded-3xl bg-app-primary-soft p-6">
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
          <View className="flex-1 rounded-2xl bg-app-surface p-4">
            <Text className="text-2xl font-bold text-app-text">{upcomingCount}</Text>
            <Text className="mt-1 text-xs font-medium text-app-muted">Next 30 days</Text>
          </View>
          <View className="flex-1 rounded-2xl bg-app-surface p-4">
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
            <View className="overflow-hidden rounded-2xl bg-app-surface">
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
