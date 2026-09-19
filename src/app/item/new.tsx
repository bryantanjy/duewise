import { eq } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import DateTimePicker from '@expo/ui/community/datetime-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { CalendarDays, Check, Plus, X } from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { db } from '@/db';
import { categories, items, reminders } from '@/db/schema';
import CategoryIcon from '@/components/categories/CategoryIcon';
import { useTheme } from '@/hooks/use-theme';
import { useAppearance } from '@/contexts/appearance';
import { createItem, updateItem } from '@/services/items';
import {
  formatDateForDisplay,
  parseStoredDate,
  toStoredDate,
  validateItemForm,
  type ItemFormField,
} from '@/utils/item-form';
import { scrollOffsetToShowField } from '@/utils/keyboard-scroll';
import {
  DEFAULT_REMINDER_DAYS,
  REMINDER_PRESETS,
  normalizeReminderDays,
  resolveReminderSelection,
  toggleReminderDay,
} from '@/utils/reminder-selection';

const categoryQuery = db.select().from(categories).orderBy(categories.id);
const DATE_TYPES = [
  { label: 'Expiry', value: 'expiry' },
  { label: 'Renewal', value: 'renewal' },
  { label: 'Birthday', value: 'birthday' },
  { label: 'Custom', value: 'custom' },
] as const;
const IMPORTANCE_OPTIONS = ['low', 'normal', 'high'] as const;

function initialTargetDate() {
  const date = new Date();
  date.setDate(date.getDate() + 30);
  return toStoredDate(date);
}

export default function NewItemScreen() {
  const colors = useTheme();
  const { resolvedTheme } = useAppearance();
  const insets = useSafeAreaInsets();
  const { editId } = useLocalSearchParams<{ editId?: string }>();
  const parsedEditId = Number(editId);
  const safeEditId = Number.isInteger(parsedEditId) ? parsedEditId : -1;
  const isEditing = safeEditId > 0;
  const editItemQuery = useMemo(
    () => db.select().from(items).where(eq(items.id, safeEditId)),
    [safeEditId],
  );
  const editReminderQuery = useMemo(
    () => db.select().from(reminders).where(eq(reminders.itemId, safeEditId)),
    [safeEditId],
  );
  const { data: categoryOptions } = useLiveQuery(categoryQuery);
  const { data: editItemRows, updatedAt: editItemUpdatedAt } = useLiveQuery(editItemQuery);
  const { data: editReminderRows, updatedAt: editReminderUpdatedAt } = useLiveQuery(editReminderQuery);
  const didHydrateEdit = useRef(false);
  const viewportRef = useRef<View>(null);
  const scrollRef = useRef<ScrollView>(null);
  const nameInputRef = useRef<TextInput>(null);
  const reminderInputRef = useRef<TextInput>(null);
  const notesInputRef = useRef<TextInput>(null);
  const focusedInput = useRef<TextInput | null>(null);
  const scrollOffset = useRef(0);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState<number>();
  const [dateType, setDateType] = useState<(typeof DATE_TYPES)[number]['value']>('expiry');
  const [targetDate, setTargetDate] = useState(initialTargetDate);
  const [importance, setImportance] = useState<(typeof IMPORTANCE_OPTIONS)[number]>('normal');
  const [repeatsYearly, setRepeatsYearly] = useState(true);
  const [reminderDays, setReminderDays] = useState<number[]>(DEFAULT_REMINDER_DAYS);
  const [customReminderDay, setCustomReminderDay] = useState('');
  const [notes, setNotes] = useState('');
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<ItemFormField, string>>
  >({});
  const [submissionError, setSubmissionError] = useState<string>();
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const shown = Keyboard.addListener('keyboardDidShow', () => {
      setKeyboardVisible(true);
      scheduleFocusedInputScroll();
    });
    const hidden = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => {
      shown.remove();
      hidden.remove();
    };
  }, []);

  function scrollFocusedInputIntoView() {
    const input = focusedInput.current;
    const scroller = scrollRef.current;
    if (!input || !scroller) return;

    viewportRef.current?.measureInWindow((_x, viewportTop, _width, viewportHeight) => {
      input.measureInWindow((_fieldX, fieldTop, _fieldWidth, fieldHeight) => {
        const nextOffset = scrollOffsetToShowField({
          currentOffset: scrollOffset.current,
          fieldTop,
          fieldHeight,
          viewportTop,
          viewportHeight,
        });
        if (Math.abs(nextOffset - scrollOffset.current) > 1) {
          scroller.scrollTo({ y: nextOffset, animated: true });
        }
      });
    });
  }

  function scheduleFocusedInputScroll() {
    requestAnimationFrame(() => requestAnimationFrame(scrollFocusedInputIntoView));
  }

  function focusInput(input: TextInput | null) {
    focusedInput.current = input;
    if (keyboardVisible) scheduleFocusedInputScroll();
  }

  function clearFieldError(field: ItemFormField) {
    setFieldErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  useEffect(() => {
    if (categoryId === undefined && categoryOptions.length > 0) {
      setCategoryId(categoryOptions[0].id);
    }
  }, [categoryId, categoryOptions]);

  useEffect(() => {
    const item = editItemRows[0];
    if (!isEditing || !item || !editItemUpdatedAt || !editReminderUpdatedAt || didHydrateEdit.current) return;

    didHydrateEdit.current = true;
    setName(item.name);
    setCategoryId(item.categoryId ?? categoryOptions[0]?.id);
    setDateType(item.dateType as (typeof DATE_TYPES)[number]['value']);
    setTargetDate(item.targetDate);
    setImportance(item.importance as (typeof IMPORTANCE_OPTIONS)[number]);
    setRepeatsYearly(item.repeatType === 'yearly');
    setReminderDays(normalizeReminderDays(editReminderRows.map(({ daysBefore }) => daysBefore)));
    setNotes(item.notes ?? '');
  }, [categoryOptions, editItemRows, editItemUpdatedAt, editReminderRows, editReminderUpdatedAt, isEditing]);

  function addCustomReminderDay() {
    const result = resolveReminderSelection(reminderDays, customReminderDay);
    if (result.error) {
      setFieldErrors((current) => ({ ...current, reminderDays: result.error }));
      return;
    }
    setReminderDays(result.values ?? []);
    setCustomReminderDay('');
    clearFieldError('reminderDays');
  }

  async function saveItem() {
    if (isSaving) return;
    setSubmissionError(undefined);

    const resolvedReminders = resolveReminderSelection(reminderDays, customReminderDay);
    const validation = validateItemForm({
      categoryId,
      name,
      reminderDays: (resolvedReminders.values ?? reminderDays).join(', '),
      targetDate,
    });
    if (resolvedReminders.error) validation.fieldErrors.reminderDays = resolvedReminders.error;
    setFieldErrors(validation.fieldErrors);
    if (Object.keys(validation.fieldErrors).length > 0 || categoryId === undefined) {
      return;
    }

    setIsSaving(true);
    try {
      const input = {
        categoryId,
        dateType,
        importance,
        name,
        notes,
        reminderDays: validation.parsedReminderDays ?? [],
        repeatType: repeatsYearly ? 'yearly' : 'none',
        targetDate,
      } as const;
      const result = isEditing
        ? await updateItem(safeEditId, input)
        : await createItem(input);

      router.replace({
        pathname: '/item/[id]',
        params: {
          [isEditing ? 'updated' : 'created']: '1',
          id: String(result.itemId),
          scheduled: String(result.scheduledReminderCount),
          skipped: String(result.skippedReminderCount),
        },
      });
    } catch (error) {
      setSubmissionError(error instanceof Error ? error.message : 'Unable to save this item.');
      setIsSaving(false);
    }
  }

  return (
    <View
      className="bg-app-bg"
      style={{ flex: 1, paddingTop: insets.top }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
        style={{ flex: 1 }}>
        <View className="flex-row items-center justify-between px-5 py-2">
          <Pressable className="py-2 pr-4" onPress={() => router.back()}>
            <Text className="text-base font-semibold text-app-primary">Cancel</Text>
          </Pressable>
          <Text className="text-xl font-bold text-app-text">
            {isEditing ? 'Edit item' : 'Add item'}
          </Text>
          {keyboardVisible ? (
            <Pressable
              accessibilityLabel="Dismiss keyboard"
              accessibilityRole="button"
              className="min-h-11 w-14 items-end justify-center"
              onPress={Keyboard.dismiss}>
              <Text className="font-semibold text-app-primary">Done</Text>
            </Pressable>
          ) : <View className="w-14" />}
        </View>

        <View ref={viewportRef} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ paddingBottom: Math.max(32, insets.bottom + 24), paddingHorizontal: 20, paddingTop: 12 }}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          onLayout={() => {
            if (keyboardVisible) scheduleFocusedInputScroll();
          }}
          onScroll={(event) => { scrollOffset.current = event.nativeEvent.contentOffset.y; }}
          ref={scrollRef}
          scrollEventThrottle={16}
          style={{ flex: 1 }}>
        <Text className="mb-2 mt-8 text-sm font-semibold text-app-text">Name</Text>
        <TextInput
          accessibilityLabel="Item name"
          className={`rounded-2xl border bg-app-surface px-4 py-4 text-base text-app-text ${fieldErrors.name ? 'border-app-danger' : 'border-app-border'}`}
          onChangeText={(value) => {
            setName(value);
            clearFieldError('name');
          }}
          onFocus={() => focusInput(nameInputRef.current)}
          placeholder="e.g. Car road tax"
          placeholderTextColor={colors.textSecondary}
          ref={nameInputRef}
          value={name}
        />
        {fieldErrors.name ? (
          <Text className="mt-2 text-sm text-app-danger">{fieldErrors.name}</Text>
        ) : null}

        <Text className="mb-2 mt-6 text-sm font-semibold text-app-text">Category</Text>
        <View className="flex-row flex-wrap justify-between gap-y-3">
          {categoryOptions.map((category) => {
            const selected = category.id === categoryId;
            return (
              <Pressable
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                className={`min-h-16 flex-row items-center rounded-2xl border px-3 py-3 ${selected ? 'border-app-primary bg-app-primary-soft' : 'border-app-border bg-app-surface'}`}
                key={category.id}
                onPress={() => {
                  setCategoryId(category.id);
                  clearFieldError('category');
                }}
                style={{ width: '48%' }}>
                <CategoryIcon color={category.color} icon={category.icon} />
                <Text className={`ml-3 flex-1 ${selected ? 'font-semibold text-app-primary' : 'text-app-text'}`}>
                  {category.name}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {fieldErrors.category ? (
          <Text className="mt-2 text-sm text-app-danger">{fieldErrors.category}</Text>
        ) : null}

        <Text className="mb-2 mt-6 text-sm font-semibold text-app-text">Date type</Text>
        <View className="flex-row gap-2">
          {DATE_TYPES.map((option) => {
            const selected = option.value === dateType;
            return (
              <Pressable
                className={`flex-1 rounded-xl border px-2 py-3 ${selected ? 'border-app-primary bg-app-primary' : 'border-app-border bg-app-surface'}`}
                key={option.value}
                onPress={() => setDateType(option.value)}>
                <Text className={`text-center text-sm ${selected ? 'font-semibold text-white' : 'text-app-text'}`}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text className="mb-2 mt-6 text-sm font-semibold text-app-text">Target date</Text>
        <Pressable
          accessibilityHint="Opens the calendar picker"
          accessibilityLabel={`Target date, ${formatDateForDisplay(targetDate)}`}
          accessibilityRole="button"
          className={`flex-row items-center rounded-2xl border bg-app-surface px-4 py-4 active:opacity-80 ${fieldErrors.targetDate ? 'border-app-danger' : 'border-app-border'}`}
          onPress={() => setShowDatePicker(true)}>
          <View className="mr-3 h-10 w-10 items-center justify-center rounded-xl bg-app-primary-soft">
            <CalendarDays color={colors.primary} size={21} strokeWidth={2} />
          </View>
          <View className="flex-1">
            <Text className="text-base font-semibold text-app-text">
              {formatDateForDisplay(targetDate)}
            </Text>
            <Text className="mt-1 text-xs text-app-muted">Tap to choose another date</Text>
          </View>
          <Text className="text-xl text-app-muted">›</Text>
        </Pressable>
        {fieldErrors.targetDate ? (
          <Text className="mt-2 text-sm text-app-danger">{fieldErrors.targetDate}</Text>
        ) : null}

        {showDatePicker ? (
          <View className={Platform.OS === 'ios' ? 'mt-3 rounded-2xl border border-app-border bg-app-surface p-3' : undefined}>
            <DateTimePicker
              accentColor={colors.primaryFill}
              display={Platform.OS === 'ios' ? 'inline' : 'default'}
              mode="date"
              onDismiss={() => setShowDatePicker(false)}
              onValueChange={(_, selectedDate) => {
                setTargetDate(toStoredDate(selectedDate));
                clearFieldError('targetDate');
                if (Platform.OS !== 'ios') setShowDatePicker(false);
              }}
              presentation="dialog"
              themeVariant={resolvedTheme}
              value={parseStoredDate(targetDate) ?? new Date()}
            />
            {Platform.OS === 'ios' ? (
              <Pressable
                accessibilityRole="button"
                className="mt-2 self-end rounded-xl bg-app-primary-soft px-4 py-2"
                onPress={() => setShowDatePicker(false)}>
                <Text className="font-semibold text-app-primary">Done</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        <View className="mt-6 flex-row items-center justify-between rounded-2xl border border-app-border bg-app-surface p-4">
          <View className="mr-4 flex-1">
            <Text className="font-semibold text-app-text">Repeat yearly</Text>
            <Text className="mt-1 text-sm text-app-muted">Keep the same month and day by default.</Text>
          </View>
          <Switch
            onValueChange={setRepeatsYearly}
            trackColor={{ false: colors.border, true: colors.primarySoft }}
            thumbColor={repeatsYearly ? colors.primaryFill : colors.surface}
            value={repeatsYearly}
          />
        </View>

        <Text className="mb-2 mt-6 text-sm font-semibold text-app-text">Importance</Text>
        <View className="flex-row gap-2">
          {IMPORTANCE_OPTIONS.map((option) => {
            const selected = option === importance;
            return (
              <Pressable
                className={`flex-1 rounded-2xl border px-3 py-3 ${selected ? 'border-app-primary bg-app-primary' : 'border-app-border bg-app-surface'}`}
                key={option}
                onPress={() => setImportance(option)}>
                <Text className={`text-center capitalize ${selected ? 'font-semibold text-white' : 'text-app-text'}`}>
                  {option}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View className="mt-7 rounded-3xl border border-app-border bg-app-surface p-5">
          <View className="flex-row items-center justify-between">
            <Text className="text-base font-bold text-app-text">Remind me</Text>
            <Text className="text-xs font-semibold text-app-primary">
              {reminderDays.length} selected
            </Text>
          </View>
          <Text className="mt-1 text-sm leading-5 text-app-muted">
            Choose any number of times before the target date.
          </Text>
          <View className="mt-5 flex-row flex-wrap justify-between gap-y-2">
            {REMINDER_PRESETS.map(({ days, label }) => {
              const selected = reminderDays.includes(days);
              return (
                <Pressable
                  accessibilityLabel={days === 0 ? 'Remind on the due day' : `Remind ${days} days before`}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: selected }}
                  className={`min-h-12 flex-row items-center justify-center rounded-xl border px-3 active:opacity-70 ${selected ? 'border-app-primary bg-app-primary-soft' : 'border-app-border bg-app-bg'}`}
                  key={days}
                  onPress={() => setReminderDays((current) => toggleReminderDay(current, days))}
                  style={{ width: '48%' }}>
                  {selected ? <Check color={colors.primary} size={16} strokeWidth={2.5} /> : null}
                  <Text className={`text-sm font-semibold ${selected ? 'ml-2 text-app-primary' : 'text-app-text'}`}>
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View className="mt-5 border-t border-app-border pt-5">
            <Text className="text-sm font-semibold text-app-text">Custom days before</Text>
            <View className="mt-2 flex-row gap-2">
              <TextInput
                accessibilityLabel="Custom reminder days before"
                className={`min-h-12 flex-1 rounded-xl border bg-app-bg px-4 text-base text-app-text ${fieldErrors.reminderDays ? 'border-app-danger' : 'border-app-border'}`}
                keyboardType="number-pad"
                onChangeText={(value) => {
                  setCustomReminderDay(value);
                  clearFieldError('reminderDays');
                }}
                onFocus={() => focusInput(reminderInputRef.current)}
                onSubmitEditing={addCustomReminderDay}
                placeholder="e.g. 45"
                placeholderTextColor={colors.textSecondary}
                ref={reminderInputRef}
                returnKeyType="done"
                value={customReminderDay}
              />
              <Pressable
                accessibilityLabel="Add custom reminder day"
                accessibilityRole="button"
                className="min-h-12 flex-row items-center rounded-xl bg-app-primary px-4 active:opacity-80"
                onPress={addCustomReminderDay}>
                <Plus color="#FFFFFF" size={17} />
                <Text className="ml-1.5 font-semibold text-white">Add</Text>
              </Pressable>
            </View>
            {reminderDays.filter((day) => !REMINDER_PRESETS.some((preset) => preset.days === day)).length > 0 ? (
              <View className="mt-3 flex-row flex-wrap gap-2">
                {reminderDays
                  .filter((day) => !REMINDER_PRESETS.some((preset) => preset.days === day))
                  .map((day) => (
                    <Pressable
                      accessibilityLabel={`Remove reminder ${day} days before`}
                      accessibilityRole="button"
                      className="min-h-11 flex-row items-center rounded-full bg-app-primary-soft px-4 active:opacity-70"
                      key={day}
                      onPress={() => setReminderDays((current) => toggleReminderDay(current, day))}>
                      <Text className="mr-2 text-sm font-semibold text-app-primary">{day} days</Text>
                      <X color={colors.primary} size={15} />
                    </Pressable>
                  ))}
              </View>
            ) : null}
            {fieldErrors.reminderDays ? (
              <Text className="mt-2 text-sm text-app-danger">{fieldErrors.reminderDays}</Text>
            ) : null}
          </View>
          <Text className="mt-4 text-xs leading-5 text-app-muted">
            Due day means the date itself. Deselect all options for no notifications.
          </Text>
        </View>

        <Text className="mb-2 mt-6 text-sm font-semibold text-app-text">Notes (optional)</Text>
        <TextInput
          accessibilityLabel="Notes"
          className="min-h-28 rounded-2xl border border-app-border bg-app-surface px-4 py-4 text-base text-app-text"
          multiline
          onChangeText={setNotes}
          onFocus={() => focusInput(notesInputRef.current)}
          placeholder="Policy number, renewal instructions, or anything useful"
          placeholderTextColor={colors.textSecondary}
          ref={notesInputRef}
          textAlignVertical="top"
          value={notes}
        />

        {submissionError ? (
          <Text selectable className="mt-5 rounded-2xl bg-app-danger-soft p-4 text-sm text-app-danger">
            {submissionError}
          </Text>
        ) : null}

        </ScrollView>
        </View>

        <View
          className="border-t border-app-border bg-app-surface px-5 pt-3"
          style={{ paddingBottom: Math.max(insets.bottom, 12) }}>
          <Pressable
            className="rounded-2xl bg-app-primary px-5 py-4 active:opacity-80 disabled:opacity-50"
            disabled={isSaving}
            onPress={saveItem}>
            <Text className="text-center text-base font-semibold text-white">
              {isSaving ? 'Saving...' : isEditing ? 'Save changes' : 'Save item'}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
