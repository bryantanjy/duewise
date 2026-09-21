import { eq } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { router } from 'expo-router';
import ArrowLeft from 'lucide-react-native/icons/arrow-left';
import ArrowRight from 'lucide-react-native/icons/arrow-right';
import CalendarIcon from 'lucide-react-native/icons/calendar';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import Plus from 'lucide-react-native/icons/plus';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import type { ItemRowData } from '@/components/items/ItemRow';
import StatusBadge from '@/components/items/StatusBadge';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { db } from '@/db';
import { categories, items } from '@/db/schema';
import { buildCalendarEventModel } from '@/utils/calendar-event-model';
import { daysUntil, formatDay, formatMonth, parseLocalDate, toDateInput } from '@/utils/dates';
import { useTheme } from '@/hooks/use-theme';

const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

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

export default function CalendarScreen() {
  const colors = useTheme();
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
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  }).format(selectedDateValue);

  function changeMonth(offset: number) {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const nextMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + offset, 1);
    setVisibleMonth(nextMonth);
    setSelectedDate(
      nextMonth.getFullYear() === today.getFullYear() && nextMonth.getMonth() === today.getMonth()
        ? todayKey
        : toDateInput(nextMonth),
    );
  }

  function selectDate(date: Date) {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setSelectedDate(toDateInput(date));
    if (
      date.getFullYear() !== visibleMonth.getFullYear() ||
      date.getMonth() !== visibleMonth.getMonth()
    ) {
      setVisibleMonth(startOfMonth(date));
    }
  }

  const handleAddPress = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    router.push('/item/new');
  };

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerClassName="px-5 pb-28 pt-4" showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="flex-row items-end justify-between">
          <View>
            <Text className="text-[11px] font-bold uppercase tracking-[1.5px] text-app-primary">
              Your horizon
            </Text>
            <Text className="mt-0.5 text-3xl font-extrabold tracking-tight text-app-text">
              Calendar
            </Text>
          </View>
          <Pressable
            accessibilityLabel="Jump to today"
            accessibilityRole="button"
            className="rounded-full px-4 py-2 active:opacity-75"
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
              setVisibleMonth(startOfMonth(today));
              setSelectedDate(todayKey);
            }}
            style={{
              backgroundColor: colors.primarySoft,
            }}>
            <Text className="text-xs font-bold text-app-primary">Today</Text>
          </Pressable>
        </View>

        {error ? (
          <Text selectable className="mt-6 rounded-2xl bg-app-danger-soft p-4 text-app-danger">
            {error.message}
          </Text>
        ) : null}

        {/* Calendar Card Grid */}
        <Card className="mt-6 p-4">
          {/* Month Navigator */}
          <View className="mb-3 flex-row items-center justify-between px-1">
            <Pressable
              accessibilityLabel="Previous month"
              accessibilityRole="button"
              className="h-10 w-10 items-center justify-center rounded-2xl active:opacity-70"
              onPress={() => changeMonth(-1)}
              style={{ backgroundColor: colors.surfaceInset }}>
              <ArrowLeft color={colors.text} size={18} strokeWidth={2.2} />
            </Pressable>

            <Text className="text-base font-extrabold tracking-tight text-app-text">
              {monthLabel}
            </Text>

            <Pressable
              accessibilityLabel="Next month"
              accessibilityRole="button"
              className="h-10 w-10 items-center justify-center rounded-2xl active:opacity-70"
              onPress={() => changeMonth(1)}
              style={{ backgroundColor: colors.surfaceInset }}>
              <ArrowRight color={colors.text} size={18} strokeWidth={2.2} />
            </Pressable>
          </View>

          {/* Weekday headers */}
          <View className="flex-row border-b pb-2 pt-1" style={{ borderColor: colors.border }}>
            {WEEKDAYS.map((weekday, index) => (
              <View
                className="items-center"
                key={`${weekday}-${index}`}
                style={{ width: '14.2857%' }}>
                <Text
                  className="text-[10px] font-bold tracking-wider"
                  style={{ color: colors.textSecondary }}>
                  {weekday}
                </Text>
              </View>
            ))}
          </View>

          {/* 42 Day Grid */}
          <View className="mt-2 flex-row flex-wrap">
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
                  className="h-13 items-center justify-center active:opacity-80"
                  key={dateKey}
                  onPress={() => selectDate(date)}
                  style={{ width: '14.2857%' }}>
                  <View
                    className="h-9 w-9 items-center justify-center rounded-2xl"
                    style={{
                      backgroundColor: isSelected
                        ? colors.primaryFill
                        : isToday
                          ? colors.primarySoft
                          : 'transparent',
                      borderWidth: isToday && !isSelected ? 1.5 : 0,
                      borderColor: colors.primary,
                      shadowColor: isSelected ? colors.primary : 'transparent',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: isSelected ? 0.35 : 0,
                      shadowRadius: 4,
                    }}>
                    <Text
                      className="text-xs font-bold"
                      style={{
                        color: isSelected
                          ? '#FFFFFF'
                          : isToday
                            ? colors.primary
                            : isCurrentMonth
                              ? colors.text
                              : colors.textSecondary,
                        opacity: !isCurrentMonth && !isSelected ? 0.35 : 1,
                        fontVariant: ['tabular-nums'],
                      }}>
                      {date.getDate()}
                    </Text>
                  </View>

                  {/* Multi-dot event indicator */}
                  <View className="mt-1 h-1.5 flex-row items-center justify-center gap-1">
                    {dayItems.slice(0, 3).map((item) => (
                      <View
                        className="h-1.5 w-1.5 rounded-full"
                        key={item.id}
                        style={{
                          backgroundColor: isSelected
                            ? colors.primary
                            : item.categoryColor ?? colors.primary,
                        }}
                      />
                    ))}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </Card>

        {/* Selected Date Agenda Header */}
        <View className="mb-3.5 mt-8 flex-row items-end justify-between px-1">
          <View>
            <Text className="text-lg font-extrabold tracking-tight text-app-text">
              {selectedDate === todayKey ? `Today · ${selectedDateLabel}` : selectedDateLabel}
            </Text>
            <Text className="mt-0.5 text-xs font-semibold text-app-muted">
              {selectedItems.length === 0
                ? 'No items scheduled'
                : `${selectedItems.length} ${selectedItems.length === 1 ? 'item' : 'items'} due`}
            </Text>
          </View>
        </View>

        {/* Selected Date Items List */}
        {selectedItems.length > 0 ? (
          <Card className="overflow-hidden p-0">
            {selectedItems.map((item, index) => {
              const model = buildCalendarEventModel(item, item.targetDate);
              const remainingDays = daysUntil(model.date);
              const isOverdue = remainingDays < 0;
              const isUrgent = remainingDays >= 0 && remainingDays <= 7;

              return (
                <Pressable
                  accessibilityLabel={`Open ${model.title}`}
                  accessibilityRole="button"
                  className={`flex-row items-center p-4 active:opacity-80 ${
                    index > 0 ? 'border-t border-app-border' : ''
                  }`}
                  key={model.id}
                  onPress={() => {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                    router.push({ pathname: '/item/[id]', params: { id: String(model.id) } });
                  }}
                  style={({ pressed }) => [
                    {
                      backgroundColor: pressed ? colors.primarySoft : 'transparent',
                    },
                  ]}>
                  {/* Left date block */}
                  <View
                    className="w-13 items-center rounded-2xl py-2"
                    style={{
                      backgroundColor: isOverdue
                        ? colors.dangerSoft
                        : isUrgent
                          ? colors.warningSoft
                          : colors.primarySoft,
                    }}>
                    <Text
                      className="text-[10px] font-extrabold tracking-wider"
                      style={{
                        color: isOverdue ? colors.danger : isUrgent ? colors.warning : colors.primary,
                      }}>
                      {formatMonth(model.date)}
                    </Text>
                    <Text
                      className="mt-0.5 text-2xl font-bold tracking-tight"
                      style={{
                        color: isOverdue ? colors.danger : colors.text,
                        fontVariant: ['tabular-nums'],
                      }}>
                      {formatDay(model.date)}
                    </Text>
                  </View>

                  {/* Body */}
                  <View className="ml-3.5 flex-1 pr-2">
                    <View className="flex-row items-center">
                      <View
                        className="mr-2 h-2 w-2 rounded-full"
                        style={{ backgroundColor: model.categoryColor }}
                      />
                      <Text className="text-xs font-semibold text-app-muted" numberOfLines={1}>
                        {model.categoryLabel}
                      </Text>
                    </View>
                    <Text
                      className="mt-1 text-[15px] font-bold tracking-tight text-app-text"
                      numberOfLines={1}>
                      {model.title}
                    </Text>
                  </View>

                  {/* Right Status & Arrow */}
                  <View className="items-end pl-1">
                    <StatusBadge targetDate={model.date} />
                    {model.highImportance ? (
                      <View
                        className="mt-1.5 rounded px-1.5 py-0.5"
                        style={{ backgroundColor: colors.dangerSoft }}>
                        <Text className="text-[9px] font-extrabold tracking-widest text-app-danger">
                          HIGH
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  <ChevronRight color={colors.textSecondary} size={16} style={{ marginLeft: 6 }} />
                </Pressable>
              );
            })}
          </Card>
        ) : (
          <Card className="items-center p-6 text-center">
            <View
              className="h-12 w-12 items-center justify-center rounded-2xl"
              style={{ backgroundColor: colors.primarySoft }}>
              <CalendarIcon color={colors.primary} size={22} />
            </View>
            <Text className="mt-3 text-base font-bold text-app-text">A clear day</Text>
            <Text className="mt-1 text-center text-xs leading-5 text-app-muted">
              Nothing scheduled on this date. Select another day or add a reminder.
            </Text>
            <View className="mt-4">
              <Button
                icon={<Plus color="#FFFFFF" size={16} />}
                onPress={handleAddPress}
                size="sm"
                title="Add reminder"
              />
            </View>
          </Card>
        )}
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

