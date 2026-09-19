import { eq } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { router } from 'expo-router';
import Plus from 'lucide-react-native/icons/plus';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { ItemRowData } from '@/components/items/ItemRow';
import { statusText } from '@/components/items/StatusBadge';
import { db } from '@/db';
import { categories, items } from '@/db/schema';
import { buildCalendarEventModel } from '@/utils/calendar-event-model';
import { daysUntil, formatDay, formatMonth, parseLocalDate, toDateInput } from '@/utils/dates';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const calendarItemsQuery = db
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

function yearlyOccurrence(targetDate: string, year: number) {
  const original = parseLocalDate(targetDate);
  if (year < original.getFullYear()) return undefined;

  const month = original.getMonth();
  const lastDay = new Date(year, month + 1, 0).getDate();
  return toDateInput(new Date(year, month, Math.min(original.getDate(), lastDay)));
}

function occurrenceForDate(item: ItemRowData, date: Date) {
  const dateKey = toDateInput(date);
  if (item.repeatType !== 'yearly') return item.targetDate === dateKey ? dateKey : undefined;
  const occurrence = yearlyOccurrence(item.targetDate, date.getFullYear());
  return occurrence === dateKey ? occurrence : undefined;
}

function itemOccurrencesForDate(data: ItemRowData[], date: Date) {
  return data.flatMap((item) => {
    const occurrenceDate = occurrenceForDate(item, date);
    return occurrenceDate ? [{ ...item, targetDate: occurrenceDate }] : [];
  });
}

const calendarStyles = StyleSheet.create({
  categoryDot: {
    borderRadius: 4,
    height: 8,
    marginRight: 8,
    width: 8,
  },
  categoryRow: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  categoryText: {
    color: '#737373',
    flexShrink: 1,
    fontSize: 12,
    fontWeight: '500',
  },
  dateBadge: {
    alignItems: 'center',
    backgroundColor: '#EFEDFF',
    borderRadius: 12,
    paddingVertical: 8,
    width: 56,
  },
  dateDay: {
    color: '#171717',
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 28,
    marginTop: 2,
  },
  dateMonth: {
    color: '#635BFF',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  eventBody: {
    flex: 1,
    marginLeft: 16,
    minWidth: 0,
  },
  eventCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    minHeight: 104,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  eventAction: {
    alignItems: 'center',
    borderTopColor: '#E8E8E5',
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    minHeight: 48,
    paddingVertical: 12,
  },
  eventActionPressed: {
    opacity: 0.65,
  },
  eventActionText: {
    color: '#635BFF',
    fontSize: 14,
    fontWeight: '600',
  },
  eventDivider: {
    borderTopColor: '#E8E8E5',
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  eventList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
  },
  eventTitle: {
    color: '#171717',
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 21,
    marginTop: 5,
  },
  highLabel: {
    color: '#D84A4A',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    marginTop: 8,
  },
  navArrow: {
    color: '#4B4B4B',
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 28,
  },
  statusChip: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusColumn: {
    alignItems: 'flex-end',
    marginLeft: 12,
    maxWidth: 104,
  },
  statusLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
});

export default function CalendarScreen() {
  const today = useMemo(() => new Date(), []);
  const todayKey = toDateInput(today);
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(today));
  const [selectedDate, setSelectedDate] = useState(todayKey);
  const { data, error } = useLiveQuery(calendarItemsQuery);
  const days = useMemo(() => calendarDays(visibleMonth), [visibleMonth]);
  const selectedDateValue = useMemo(() => parseLocalDate(selectedDate), [selectedDate]);
  const selectedItems = useMemo(
    () => itemOccurrencesForDate(data, selectedDateValue),
    [data, selectedDateValue],
  );
  const monthLabel = new Intl.DateTimeFormat(undefined, {
    month: 'long',
    year: 'numeric',
  }).format(visibleMonth);
  const selectedDateLabel = new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'long',
    weekday: 'long',
  }).format(selectedDateValue);

  function changeMonth(offset: number) {
    const nextMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + offset, 1);
    setVisibleMonth(nextMonth);
    setSelectedDate(
      nextMonth.getFullYear() === today.getFullYear() && nextMonth.getMonth() === today.getMonth()
        ? todayKey
        : toDateInput(nextMonth),
    );
  }

  function selectDate(date: Date) {
    setSelectedDate(toDateInput(date));
    if (
      date.getFullYear() !== visibleMonth.getFullYear() ||
      date.getMonth() !== visibleMonth.getMonth()
    ) {
      setVisibleMonth(startOfMonth(date));
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-app-bg" edges={['top']}>
      <ScrollView contentContainerClassName="px-5 pb-28 pt-4">
        <View className="flex-row items-end justify-between">
          <View>
            <Text className="text-xs font-bold uppercase tracking-[2px] text-app-primary">
              Your horizon
            </Text>
            <Text className="mt-1 text-3xl font-bold tracking-tight text-app-text">Calendar</Text>
          </View>
          <Pressable
            accessibilityLabel="Jump to today"
            className="min-h-11 justify-center rounded-full bg-app-primary-soft px-4 active:opacity-70"
            onPress={() => {
              setVisibleMonth(startOfMonth(today));
              setSelectedDate(todayKey);
            }}>
            <Text className="text-sm font-semibold text-app-primary">Today</Text>
          </Pressable>
        </View>

        {error ? (
          <Text selectable className="mt-6 rounded-2xl bg-app-danger-soft p-4 text-app-danger">
            {error.message}
          </Text>
        ) : null}

        <View className="mt-7 overflow-hidden rounded-3xl border border-app-border bg-app-surface px-3 pb-4 pt-3">
          <View className="mb-2 flex-row items-center justify-between px-1">
            <Pressable
              accessibilityLabel="Previous month"
              className="h-11 w-11 items-center justify-center rounded-full active:bg-app-primary-soft"
              onPress={() => changeMonth(-1)}>
              <Text style={calendarStyles.navArrow}>←</Text>
            </Pressable>
            <Text className="text-lg font-bold text-app-text">{monthLabel}</Text>
            <Pressable
              accessibilityLabel="Next month"
              className="h-11 w-11 items-center justify-center rounded-full active:bg-app-primary-soft"
              onPress={() => changeMonth(1)}>
              <Text style={calendarStyles.navArrow}>→</Text>
            </Pressable>
          </View>

          <View className="flex-row">
            {WEEKDAYS.map((weekday, index) => (
              <View className="items-center py-2" key={`${weekday}-${index}`} style={{ width: '14.2857%' }}>
                <Text className="text-[11px] font-bold text-app-muted">{weekday}</Text>
              </View>
            ))}
          </View>

          <View className="flex-row flex-wrap">
            {days.map((date) => {
              const dateKey = toDateInput(date);
              const isSelected = dateKey === selectedDate;
              const isToday = dateKey === todayKey;
              const isCurrentMonth = date.getMonth() === visibleMonth.getMonth();
              const dayItems = itemOccurrencesForDate(data, date);

              return (
                <Pressable
                  accessibilityLabel={`${new Intl.DateTimeFormat(undefined, {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  }).format(date)}, ${dayItems.length} due`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  className="h-14 items-center justify-center rounded-2xl active:bg-app-primary-soft"
                  key={dateKey}
                  onPress={() => selectDate(date)}
                  style={{ width: '14.2857%' }}>
                  <View
                    className={`h-8 w-8 items-center justify-center rounded-full ${
                      isSelected ? 'bg-app-primary' : isToday ? 'border border-app-primary' : ''
                    }`}>
                    <Text
                      className={`text-sm font-semibold ${
                        isSelected
                          ? 'text-white'
                          : isCurrentMonth
                            ? isToday
                              ? 'text-app-primary'
                              : 'text-app-text'
                            : 'text-[#B8B8B5]'
                      }`}>
                      {date.getDate()}
                    </Text>
                  </View>
                  <View className="mt-0.5 h-1 flex-row items-center justify-center gap-0.5">
                    {dayItems.slice(0, 3).map((item) => (
                      <View
                        className="h-1 w-1 rounded-full"
                        key={item.id}
                        style={{ backgroundColor: isSelected ? '#FFFFFF' : item.categoryColor ?? '#737373' }}
                      />
                    ))}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View className="mb-3 mt-8 flex-row items-end justify-between">
          <View>
            <Text className="text-lg font-bold text-app-text">
              {selectedDate === todayKey ? 'Today' : selectedDateLabel}
            </Text>
            <Text className="mt-1 text-sm text-app-muted">
              {selectedItems.length === 0
                ? 'No dates need attention'
                : `${selectedItems.length} ${selectedItems.length === 1 ? 'item' : 'items'} due`}
            </Text>
          </View>
        </View>

        {selectedItems.length > 0 ? (
          <View style={calendarStyles.eventList}>
            {selectedItems.map((item, index) => {
              const model = buildCalendarEventModel(item, item.targetDate);
              const remainingDays = daysUntil(model.date);
              const statusColors =
                remainingDays < 0
                  ? { backgroundColor: '#FFF0F0', color: '#D84A4A' }
                  : remainingDays <= 7
                    ? { backgroundColor: '#FFF6E8', color: '#D99132' }
                    : { backgroundColor: '#EFEDFF', color: '#635BFF' };

              return (
                <View
                  key={model.id}
                  style={index > 0 ? calendarStyles.eventDivider : undefined}>
                  <View style={calendarStyles.eventCard}>
                    <View style={calendarStyles.dateBadge}>
                      <Text style={calendarStyles.dateMonth}>{formatMonth(model.date)}</Text>
                      <Text style={calendarStyles.dateDay}>{formatDay(model.date)}</Text>
                    </View>

                    <View style={calendarStyles.eventBody}>
                      <View style={calendarStyles.categoryRow}>
                        <View
                          style={[
                            calendarStyles.categoryDot,
                            { backgroundColor: model.categoryColor },
                          ]}
                        />
                        <Text numberOfLines={1} style={calendarStyles.categoryText}>
                          {model.categoryLabel}
                        </Text>
                      </View>
                      <Text numberOfLines={2} style={calendarStyles.eventTitle}>
                        {model.title}
                      </Text>
                    </View>

                    <View style={calendarStyles.statusColumn}>
                      <View
                        style={[
                          calendarStyles.statusChip,
                          { backgroundColor: statusColors.backgroundColor },
                        ]}>
                        <Text
                          numberOfLines={1}
                          style={[calendarStyles.statusLabel, { color: statusColors.color }]}>
                          {statusText(model.date)}
                        </Text>
                      </View>
                      {model.highImportance ? (
                        <Text style={calendarStyles.highLabel}>HIGH</Text>
                      ) : null}
                    </View>
                  </View>

                  <Pressable
                    accessibilityLabel={`Open ${model.title}`}
                    accessibilityRole="button"
                    onPress={() =>
                      router.push({ pathname: '/item/[id]', params: { id: String(model.id) } })
                    }
                    style={({ pressed }) => [
                      calendarStyles.eventAction,
                      pressed && calendarStyles.eventActionPressed,
                    ]}>
                    <Text style={calendarStyles.eventActionText}>Open details</Text>
                    <Text style={calendarStyles.eventActionText}>›</Text>
                  </Pressable>
                </View>
              );
            })}
          </View>
        ) : (
          <View className="rounded-2xl border border-app-border bg-app-surface p-5">
            <Text className="font-semibold text-app-text">A clear day</Text>
            <Text className="mt-1 text-sm leading-5 text-app-muted">
              Select another date or add something you want Duewise to remember.
            </Text>
            <Pressable
              className="mt-4 self-start flex-row items-center rounded-xl bg-app-primary-soft px-4 py-3 active:opacity-70"
              onPress={() => router.push('/item/new')}>
              <Plus color="#635BFF" size={17} />
              <Text className="ml-2 font-semibold text-app-primary">Add an item</Text>
            </Pressable>
          </View>
        )}
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
