import { eq } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { router } from 'expo-router';
import CircleAlert from 'lucide-react-native/icons/circle-alert';
import ArrowRight from 'lucide-react-native/icons/arrow-right';
import Calendar from 'lucide-react-native/icons/calendar';
import Plus from 'lucide-react-native/icons/plus';
import Settings from 'lucide-react-native/icons/settings';
import Sparkles from 'lucide-react-native/icons/sparkles';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import BrandMark from '@/components/brand/BrandMark';
import ExpiryCard from '@/components/items/ExpiryCard';
import ItemRow, { type ItemRowData } from '@/components/items/ItemRow';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { db } from '@/db';
import { categories, items } from '@/db/schema';
import { daysUntil } from '@/utils/dates';
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
  const upcomingItems = data.filter((item) => item.id !== nextItem?.id).slice(0, 4);

  const todayFormatted = new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  }).format(new Date());

  const handleSettingsPress = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    router.push('/settings');
  };

  const handleAddPress = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    router.push('/item/new');
  };

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerClassName="px-5 pb-24 pt-4" showsVerticalScrollIndicator={false}>
        {/* Top App Bar */}
        <View className="flex-row items-center justify-between">
          <View className="flex-1 flex-row items-center">
            <BrandMark size={42} />
            <View className="ml-3 flex-1">
              <Text className="text-[11px] font-bold uppercase tracking-[1.5px] text-app-primary">
                {todayFormatted}
              </Text>
              <Text className="mt-0.5 text-xl font-extrabold tracking-tight text-app-text">
                Duewise
              </Text>
            </View>
          </View>
          <Pressable
            accessibilityLabel="Settings"
            className="h-11 w-11 items-center justify-center rounded-2xl border active:opacity-75"
            onPress={handleSettingsPress}
            style={{
              backgroundColor: colors.surface,
              borderColor: colors.border,
            }}>
            <Settings color={colors.text} size={20} />
          </Pressable>
        </View>

        {error ? (
          <Text selectable className="mt-6 rounded-2xl bg-app-danger-soft p-4 text-app-danger">
            {error.message}
          </Text>
        ) : null}

        {/* Featured Hero Card */}
        {nextItem ? (
          <ExpiryCard item={nextItem} onPress={() => openItem(nextItem)} />
        ) : (
          <Card className="mt-6 p-6">
            <View className="flex-row items-center">
              <View
                className="h-10 w-10 items-center justify-center rounded-2xl"
                style={{ backgroundColor: colors.primarySoft }}>
                <Sparkles color={colors.primary} size={20} />
              </View>
              <View className="ml-3">
                <Text className="text-xs font-bold uppercase tracking-wider text-app-primary">
                  Welcome to Duewise
                </Text>
                <Text className="text-lg font-bold text-app-text">Your horizon is clear</Text>
              </View>
            </View>
            <Text className="mt-3 text-sm leading-6 text-app-muted">
              Never let an important warranty, renewal, passport, or birthday slip your mind. Add your first date below.
            </Text>
            <View className="mt-5">
              <Button
                icon={<Plus color="#FFFFFF" size={18} />}
                onPress={handleAddPress}
                title="Add first reminder"
              />
            </View>
          </Card>
        )}

        {/* Bento Metric Cards */}
        <View className="mt-5 flex-row gap-3">
          {/* Upcoming Card */}
          <Card
            className="flex-1 p-4"
            onPress={() => router.push('/items')}
            variant="default">
            <View className="flex-row items-center justify-between">
              <View
                className="h-8 w-8 items-center justify-center rounded-xl"
                style={{ backgroundColor: colors.primarySoft }}>
                <Calendar color={colors.primary} size={16} />
              </View>
              <ArrowRight color={colors.textSecondary} size={14} />
            </View>
            <Text
              className="mt-3 text-2xl font-extrabold text-app-text"
              style={{ fontVariant: ['tabular-nums'] }}>
              {upcomingCount}
            </Text>
            <Text className="mt-0.5 text-xs font-semibold text-app-muted">
              Next 30 days
            </Text>
          </Card>

          {/* Overdue Card */}
          <Card
            className="flex-1 p-4"
            onPress={() => router.push('/items')}
            variant="default">
            <View className="flex-row items-center justify-between">
              <View
                className="h-8 w-8 items-center justify-center rounded-xl"
                style={{
                  backgroundColor: overdueCount > 0 ? colors.dangerSoft : colors.surfaceInset,
                }}>
                <CircleAlert
                  color={overdueCount > 0 ? colors.danger : colors.textSecondary}
                  size={16}
                />
              </View>
              <ArrowRight color={colors.textSecondary} size={14} />
            </View>
            <Text
              className={`mt-3 text-2xl font-extrabold ${overdueCount > 0 ? 'text-app-danger' : 'text-app-text'}`}
              style={{ fontVariant: ['tabular-nums'] }}>
              {overdueCount}
            </Text>
            <Text className="mt-0.5 text-xs font-semibold text-app-muted">
              {overdueCount > 0 ? 'Needs attention' : 'Overdue'}
            </Text>
          </Card>
        </View>

        {/* Coming Up Section */}
        {upcomingItems.length > 0 ? (
          <View className="mt-8">
            <View className="mb-3.5 flex-row items-center justify-between px-1">
              <View className="flex-row items-center">
                <Text className="text-lg font-bold tracking-tight text-app-text">Coming up</Text>
                <View
                  className="ml-2.5 rounded-full px-2 py-0.5"
                  style={{ backgroundColor: colors.primarySoft }}>
                  <Text className="text-xs font-bold text-app-primary">
                    {upcomingItems.length}
                  </Text>
                </View>
              </View>
              <Pressable
                className="min-h-11 justify-center pl-4 active:opacity-70"
                onPress={() => router.push('/items')}>
                <Text className="text-xs font-bold uppercase tracking-wider text-app-primary">
                  View all
                </Text>
              </Pressable>
            </View>

            <Card className="overflow-hidden p-0">
              {upcomingItems.map((item, index) => (
                <ItemRow
                  item={item}
                  key={item.id}
                  onPress={() => openItem(item)}
                  showDivider={index > 0}
                />
              ))}
            </Card>
          </View>
        ) : null}
      </ScrollView>

      {/* Floating Action Button */}
      {data.length > 0 ? (
        <Pressable
          accessibilityLabel="Add new item"
          accessibilityRole="button"
          className="absolute bottom-6 right-6 h-14 w-14 items-center justify-center rounded-full active:opacity-85"
          onPress={handleAddPress}
          style={{
            backgroundColor: colors.primaryFill,
            shadowColor: colors.primary,
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.35,
            shadowRadius: 10,
            elevation: 8,
          }}>
          <Plus color="#FFFFFF" size={24} strokeWidth={2.5} />
        </Pressable>
      ) : null}
    </SafeAreaView>
  );
}
