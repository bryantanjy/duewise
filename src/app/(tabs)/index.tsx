import { eq } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { router, useFocusEffect } from 'expo-router';
import ArrowRight from 'lucide-react-native/icons/arrow-right';
import Plus from 'lucide-react-native/icons/plus';
import Settings from 'lucide-react-native/icons/settings';
import { useCallback, useState } from 'react';
import { AppState, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BrandMark from '@/components/brand/BrandMark';
import ExpiryCard from '@/components/items/ExpiryCard';
import HomeReminderRow from '@/components/items/HomeReminderRow';
import type { ItemRowData } from '@/components/items/ItemRow';
import { db } from '@/db';
import { categories, items } from '@/db/schema';
import { daysUntil, parseLocalDate, toDateInput } from '@/utils/dates';
import { useTheme } from '@/hooks/use-theme';

const dashboardItemsQuery = db.select({
  categoryColor: categories.color, categoryName: categories.name, id: items.id,
  importance: items.importance, name: items.name, repeatType: items.repeatType,
  repeatInterval: items.repeatInterval, targetDate: items.targetDate,
}).from(items).leftJoin(categories, eq(items.categoryId, categories.id))
  .where(eq(items.archived, false)).orderBy(items.targetDate);

function openItem(item: ItemRowData) {
  router.push({ pathname: '/item/[id]', params: { id: String(item.id) } });
}

export default function HomeScreen() {
  const colors = useTheme();
  const { data, error } = useLiveQuery(dashboardItemsQuery);
  const [today, setToday] = useState(() => toDateInput(new Date()));
  useFocusEffect(useCallback(() => {
    const refresh = () => setToday(toDateInput(new Date()));
    refresh();
    const timer = setInterval(refresh, 60000);
    const listener = AppState.addEventListener('change', (state) => { if (state === 'active') refresh(); });
    return () => { clearInterval(timer); listener.remove(); };
  }, []));
  const overdueCount = data.filter((item) => daysUntil(item.targetDate) < 0).length;
  const upcomingCount = data.filter((item) => {
    const days = daysUntil(item.targetDate);
    return days >= 0 && days <= 30;
  }).length;
  const nextItem = data.find((item) => daysUntil(item.targetDate) >= 0) ?? data[0];
  const remainingItems = data.filter((item) => item.id !== nextItem?.id);
  const todayFormatted = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'short', day: 'numeric' }).format(parseLocalDate(today));
  const addItem = () => router.push('/item/new');

  return <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.homeBackground }}>
    <ScrollView showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 16, paddingBottom: 28 }}>
      <View style={{ width: '100%', maxWidth: 640, alignSelf: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <BrandMark size={32} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 19, lineHeight: 25, fontWeight: '600', letterSpacing: -0.45, color: colors.text }}>Duewise</Text>
              <Text style={{ fontSize: 12, lineHeight: 18, marginTop: 1, color: colors.textSecondary }}>{todayFormatted}</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {data.length > 0 ? <Pressable accessibilityRole="button" accessibilityLabel="Add new reminder" onPress={addItem}
              style={({ pressed }) => ({ width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primaryFill,
                alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.85 : 1 })}>
              <Plus color={colors.onPrimary} size={21} strokeWidth={1.8} />
            </Pressable> : null}
            <Pressable accessibilityRole="button" accessibilityLabel="Settings" onPress={() => router.push('/settings')}
              style={({ pressed }) => ({ width: 48, height: 48, alignItems: 'center', justifyContent: 'center',
                borderRadius: 24, backgroundColor: pressed ? colors.surfaceInset : colors.surface,
                borderWidth: 1, borderColor: colors.border })}>
              <Settings color={colors.textSecondary} size={20} strokeWidth={1.7} />
            </Pressable>
          </View>
        </View>

        {error ? <Text selectable style={{ marginTop: 20, padding: 16, borderRadius: 14, color: colors.danger, backgroundColor: colors.dangerSoft }}>{error.message}</Text> : null}

        <View style={{ marginTop: 30, marginBottom: 12 }}>
          <Text accessibilityRole="header" style={{ fontSize: 20, lineHeight: 27, fontWeight: '600', letterSpacing: -0.5, color: colors.text }}>
            {nextItem ? daysUntil(nextItem.targetDate) < 0 ? 'Needs your attention' : 'Your next reminder' : 'A little more peace of mind'}
          </Text>
        </View>
        {nextItem ? <ExpiryCard item={nextItem} onPress={() => openItem(nextItem)} /> : (
          <View style={{ padding: 24, borderRadius: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface }}>
            <Text style={{ fontSize: 24, lineHeight: 32, letterSpacing: -0.6, fontWeight: '600', color: colors.text }}>One less thing to keep in mind.</Text>
            <Text style={{ fontSize: 14, lineHeight: 23, color: colors.textSecondary, marginTop: 12 }}>Keep renewals, expiry dates, and important moments together. Start with your first reminder.</Text>
            <Pressable accessibilityRole="button" onPress={addItem} style={({ pressed }) => ({ marginTop: 22, minHeight: 48,
              paddingHorizontal: 18, borderRadius: 14, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center',
              alignSelf: 'flex-start', backgroundColor: colors.primaryFill, opacity: pressed ? 0.85 : 1 })}>
              <Plus color={colors.onPrimary} size={18} /><Text style={{ color: colors.onPrimary, fontSize: 14, fontWeight: '600' }}>Add first reminder</Text>
            </Pressable>
          </View>
        )}

        <View style={{ marginTop: 16, flexDirection: 'row', backgroundColor: colors.surface, borderRadius: 16,
          borderWidth: 1, borderColor: colors.border }}>
          <Pressable accessibilityRole="button" accessibilityLabel={`${upcomingCount} reminders in the next 30 days. View items`}
            onPress={() => router.push({ pathname: '/items', params: { status: 'next30' } })}
            style={({ pressed }) => ({ flex: 1, minHeight: 86, paddingHorizontal: 18, paddingVertical: 14, opacity: pressed ? 0.6 : 1 })}>
            <Text style={{ fontSize: 25, lineHeight: 32, fontWeight: '500', letterSpacing: -0.7, color: colors.text, fontVariant: ['tabular-nums'] }}>{upcomingCount}</Text>
            <Text style={{ marginTop: 3, fontSize: 12, lineHeight: 18, color: colors.textSecondary }}>Next 30 days</Text>
          </Pressable>
          <View style={{ width: 1, marginVertical: 16, backgroundColor: colors.border }} />
          <Pressable accessibilityRole="button" accessibilityLabel={`${overdueCount} overdue reminders. View items`}
            onPress={() => router.push({ pathname: '/items', params: { status: 'overdue' } })}
            style={({ pressed }) => ({ flex: 1, minHeight: 86, paddingHorizontal: 18, paddingVertical: 14, opacity: pressed ? 0.6 : 1 })}>
            <Text style={{ fontSize: 25, lineHeight: 32, fontWeight: '500', letterSpacing: -0.7,
              color: overdueCount > 0 ? colors.danger : colors.text, fontVariant: ['tabular-nums'] }}>{overdueCount}</Text>
            <Text style={{ marginTop: 3, fontSize: 12, lineHeight: 18, color: colors.textSecondary }}>Overdue</Text>
          </Pressable>
        </View>

        {remainingItems.length > 0 ? <View style={{ marginTop: 24 }}>
          <View style={{ marginBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
            <Text accessibilityRole="header" style={{ flex: 1, fontSize: 18, lineHeight: 25, letterSpacing: -0.35, fontWeight: '600', color: colors.text }}>More reminders</Text>
            <Pressable accessibilityRole="button" onPress={() => router.push('/items')}
              style={({ pressed }) => ({ minHeight: 48, flexDirection: 'row', gap: 6, alignItems: 'center', opacity: pressed ? 0.6 : 1 })}>
              <Text style={{ fontSize: 12, fontWeight: '500', color: colors.primary }}>View all</Text>
              <ArrowRight color={colors.primary} size={14} strokeWidth={1.7} />
            </Pressable>
          </View>
          <View style={{ borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: colors.border }}>
            {remainingItems.slice(0, 4).map((item, index) => <HomeReminderRow key={item.id} item={item} showDivider={index > 0} onPress={() => openItem(item)} />)}
          </View>
        </View> : null}
      </View>
    </ScrollView>
  </SafeAreaView>;
}
