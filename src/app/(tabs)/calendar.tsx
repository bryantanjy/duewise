import { occurrenceOnDate } from '@/utils/recurrence';
import { eq } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { router, useFocusEffect } from 'expo-router';
import ChevronLeft from 'lucide-react-native/icons/chevron-left';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import CalendarIcon from 'lucide-react-native/icons/calendar';
import Plus from 'lucide-react-native/icons/plus';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, AppState, FlatList, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { ItemRowData } from '@/components/items/ItemRow';
import HomeReminderRow from '@/components/items/HomeReminderRow';
import { db } from '@/db';
import { categories, items } from '@/db/schema';
import { parseLocalDate, toDateInput } from '@/utils/dates';
import { useTheme } from '@/hooks/use-theme';
const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const calendarItemsQuery = db
  .select({
    categoryColor: categories.color,
    categoryName: categories.name,
    id: items.id,
    importance: items.importance,
    name: items.name,
    repeatType: items.repeatType,
    repeatInterval: items.repeatInterval,
    targetDate: items.targetDate,
  })
  .from(items)
  .leftJoin(categories, eq(items.categoryId, categories.id))
  .where(eq(items.archived, false))
  .orderBy(items.targetDate);

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function calendarDays(month: Date) {
  const firstDay = startOfMonth(month);
  const gridStart = new Date(firstDay);
  gridStart.setDate(firstDay.getDate() - firstDay.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    return date;
  });
}

function occurrenceForDate(item: ItemRowData, date: Date) {
  const dateKey = toDateInput(date);
  return occurrenceOnDate(item.targetDate, item.repeatType, item.repeatInterval ?? 1, dateKey) ? dateKey : undefined;
}

function itemOccurrencesForDate(data: ItemRowData[], date: Date) {
  return data.flatMap((item) => {
    const occurrenceDate = occurrenceForDate(item, date);
    return occurrenceDate ? [{ ...item, targetDate: occurrenceDate }] : [];
  });
}

export default function CalendarScreen() {
  const colors = useTheme();
  const [todayKey, setTodayKey] = useState(() => toDateInput(new Date()));
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState(todayKey);
  const { data, error, updatedAt } = useLiveQuery(calendarItemsQuery);
  useFocusEffect(useCallback(() => {
    const refresh = () => setTodayKey(toDateInput(new Date()));
    refresh();
    const timer = setInterval(refresh, 60000);
    const subscription = AppState.addEventListener('change', refresh);
    return () => { clearInterval(timer); subscription.remove(); };
  }, []));
  const days = useMemo(() => calendarDays(visibleMonth).map(date => ({
    date, key: toDateInput(date), count: itemOccurrencesForDate(data, date).length,
  })), [data, visibleMonth]);
  const selectedDateValue = useMemo(() => parseLocalDate(selectedDate), [selectedDate]);
  const selectedItems = useMemo(() => itemOccurrencesForDate(data, selectedDateValue), [data, selectedDateValue]);
  const monthLabel = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(visibleMonth);
  const dateLabel = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'short', day: 'numeric' }).format(selectedDateValue);
  const loading = !updatedAt && !error && data.length === 0;
  function selectDate(date: Date) {
    setSelectedDate(toDateInput(date));
    setVisibleMonth(startOfMonth(date));
  }
  function changeMonth(offset: number) {
    const next = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + offset, 1);
    const today = parseLocalDate(todayKey);
    selectDate(next.getFullYear() === today.getFullYear() && next.getMonth() === today.getMonth() ? today : next);
  }
  const addReminder = () => router.push({ pathname: '/item/new', params: { date: selectedDate } });
  return <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.homeBackground }}>
    <View style={{ paddingHorizontal: 24, paddingTop: 18, paddingBottom: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
      <Text accessibilityRole="header" style={{ color: colors.text, fontSize: 26, lineHeight: 34, fontWeight: '600', letterSpacing: -0.8 }}>Calendar</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Add reminder for selected date" onPress={addReminder}
        style={({ pressed }) => ({ width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primaryFill, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.75 : 1 })}>
        <Plus color="#FFFFFF" size={23} strokeWidth={2} />
      </Pressable>
    </View>
    <FlatList data={error ? [] : selectedItems} keyExtractor={item => String(item.id)} initialNumToRender={10}
      contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }} showsVerticalScrollIndicator={false}
      ListHeaderComponent={<>
        <View style={{ borderRadius: 22, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 8, paddingTop: 12, paddingBottom: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4, marginBottom: 14 }}>
            <Text accessibilityRole="header" accessibilityLiveRegion="polite" style={{ flex: 1, paddingLeft: 8, fontSize: 18, lineHeight: 26, fontWeight: '600', letterSpacing: -0.3, color: colors.text }}>{monthLabel}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Previous month" onPress={() => changeMonth(-1)} style={({ pressed }) => ({ width: 44, height: 48, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.45 : 1 })}><ChevronLeft color={colors.textSecondary} size={20} /></Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Next month" onPress={() => changeMonth(1)} style={({ pressed }) => ({ width: 44, height: 48, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.45 : 1 })}><ChevronRight color={colors.textSecondary} size={20} /></Pressable>
          </View>
          <View style={{ flexDirection: 'row', marginBottom: 6 }}>
            {WEEKDAYS.map((day, index) => <Text key={index} style={{ width: '14.2857%', textAlign: 'center', color: colors.textSecondary, fontSize: 11, lineHeight: 20, fontWeight: '500' }}>{day}</Text>)}
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {days.map(({ date, key, count }) => {
              const selected = key === selectedDate;
              const today = key === todayKey;
              const currentMonth = date.getMonth() === visibleMonth.getMonth();
              return <Pressable key={key} accessibilityRole="button" accessibilityState={{ selected }}
                accessibilityLabel={`${new Intl.DateTimeFormat(undefined, { dateStyle: 'full' }).format(date)}${today ? ', today' : ''}, ${count} ${count === 1 ? 'reminder' : 'reminders'}`}
                onPress={() => selectDate(date)} style={({ pressed }) => ({ width: '14.2857%', minHeight: 52, paddingVertical: 4, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.6 : 1 })}>
                <View style={{ width: 34, minHeight: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: selected ? colors.primaryFill : today ? colors.primarySoft : 'transparent', borderWidth: today && !selected ? 1 : 0, borderColor: colors.primary }}>
                  <Text style={{ fontSize: 14, lineHeight: 24, fontWeight: selected || today ? '600' : '400', color: selected ? '#FFFFFF' : today ? colors.primary : colors.text, opacity: !currentMonth && !selected ? 0.4 : 1, fontVariant: ['tabular-nums'] }}>{date.getDate()}</Text>
                </View>
                <View style={{ height: 6, marginTop: 3, alignItems: 'center', justifyContent: 'center' }}>
                  {count > 0 ? <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: colors.primary, opacity: currentMonth ? 1 : 0.4 }} /> : null}
                </View>
              </Pressable>;
            })}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, marginTop: 6, gap: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 }}><View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: colors.primary }} /><Text style={{ color: colors.textSecondary, fontSize: 11, lineHeight: 18 }}>Reminders scheduled</Text></View>
            <Pressable accessibilityRole="button" accessibilityLabel="Jump to today" onPress={() => selectDate(parseLocalDate(todayKey))} style={({ pressed }) => ({ minHeight: 44, paddingHorizontal: 8, justifyContent: 'center', opacity: pressed ? 0.5 : 1 })}><Text style={{ fontSize: 13, fontWeight: '500', color: colors.primary }}>Today</Text></Pressable>
          </View>
        </View>
        <View style={{ marginTop: 28, marginBottom: 14, paddingHorizontal: 4 }}>
          <Text accessibilityRole="header" style={{ fontSize: 19, lineHeight: 27, fontWeight: '600', letterSpacing: -0.4, color: colors.text }}>{selectedDate === todayKey ? 'Today' : dateLabel}</Text>
          <Text accessibilityLiveRegion="polite" style={{ marginTop: 4, color: colors.textSecondary, fontSize: 12, lineHeight: 19 }}>{selectedDate === todayKey ? `${dateLabel} / ` : ''}{loading ? 'Loading reminders...' : error ? 'Reminders unavailable' : `${selectedItems.length} ${selectedItems.length === 1 ? 'reminder' : 'reminders'}`}</Text>
        </View>
      </>}
      renderItem={({ item, index }) => <View style={{ overflow: 'hidden', borderLeftWidth: 1, borderRightWidth: 1, borderTopWidth: index === 0 ? 1 : 0, borderBottomWidth: index === selectedItems.length - 1 ? 1 : 0, borderColor: colors.border, borderTopLeftRadius: index === 0 ? 20 : 0, borderTopRightRadius: index === 0 ? 20 : 0, borderBottomLeftRadius: index === selectedItems.length - 1 ? 20 : 0, borderBottomRightRadius: index === selectedItems.length - 1 ? 20 : 0 }}>
        <HomeReminderRow item={item} showDivider={index > 0} onPress={() => router.push(`/item/${item.id}`)} />
      </View>}
      ListEmptyComponent={loading ? <ActivityIndicator color={colors.primary} style={{ padding: 32 }} /> : <View style={{ padding: 26, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center' }}>
        <CalendarIcon color={colors.textSecondary} size={24} strokeWidth={1.5} />
        <Text style={{ marginTop: 14, color: colors.text, fontSize: 17, lineHeight: 25, fontWeight: '500' }}>{error ? 'Unable to load reminders' : 'A little breathing room.'}</Text>
        <Text style={{ marginTop: 6, color: colors.textSecondary, fontSize: 13, lineHeight: 21, textAlign: 'center' }}>{error ? 'Your reminders could not be loaded. Reopen this screen to try again.' : 'Nothing scheduled for this date. Keep it clear, or plan something ahead.'}</Text>
        {!error ? <Pressable accessibilityRole="button" onPress={addReminder} style={({ pressed }) => ({ minHeight: 48, justifyContent: 'center', marginTop: 12, paddingHorizontal: 16, opacity: pressed ? 0.5 : 1 })}><Text style={{ fontSize: 14, fontWeight: '600', color: colors.primary }}>Add reminder</Text></Pressable> : null}
      </View>}
    />
  </SafeAreaView>;
}
