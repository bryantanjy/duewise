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
import * as Haptics from 'expo-haptics';

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
        {/* Navigation Bar */}
        <View className="flex-row items-center justify-between px-5 py-3">
          <Pressable
            accessibilityLabel="Cancel and go back"
            accessibilityRole="button"
            className="py-1 pr-4 active:opacity-70"
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
              router.back();
            }}>
            <Text className="text-sm font-bold text-app-primary">Cancel</Text>
          </Pressable>
          <Text className="text-lg font-extrabold tracking-tight text-app-text">
            {isEditing ? 'Edit Item' : 'New Reminder'}
          </Text>
          {keyboardVisible ? (
            <Pressable
              accessibilityLabel="Dismiss keyboard"
              accessibilityRole="button"
              className="min-h-11 w-14 items-end justify-center active:opacity-70"
              onPress={Keyboard.dismiss}>
              <Text className="text-sm font-bold text-app-primary">Done</Text>
            </Pressable>
          ) : (
            <View className="w-14" />
          )}
        </View>

        <View ref={viewportRef} style={{ flex: 1 }}>
          <ScrollView
            contentContainerStyle={{
              paddingBottom: Math.max(32, insets.bottom + 24),
              paddingHorizontal: 20,
              paddingTop: 8,
            }}
            keyboardDismissMode="on-drag"
            keyboardShouldPersistTaps="handled"
            onLayout={() => {
              if (keyboardVisible) scheduleFocusedInputScroll();
            }}
            onScroll={(event) => {
              scrollOffset.current = event.nativeEvent.contentOffset.y;
            }}
            ref={scrollRef}
            scrollEventThrottle={16}
            showsVerticalScrollIndicator={false}
            style={{ flex: 1 }}>
            {/* Section 1: Item Basic Info */}
            <Text className="mb-2 mt-4 text-[11px] font-bold uppercase tracking-[1.5px] text-app-muted">
              General Info
            </Text>
            <View
              className="rounded-3xl border p-4"
              style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
              <Text className="mb-2 text-xs font-bold uppercase tracking-wider text-app-muted">
                Item Name
              </Text>
              <TextInput
                accessibilityLabel="Item name"
                className={`rounded-2xl border px-4 py-3.5 text-base text-app-text ${
                  fieldErrors.name ? 'border-app-danger' : 'border-app-border'
                }`}
                onChangeText={(value) => {
                  setName(value);
                  clearFieldError('name');
                }}
                onFocus={() => focusInput(nameInputRef.current)}
                placeholder="e.g. Passport Renewal, Car Insurance"
                placeholderTextColor={colors.textSecondary}
                ref={nameInputRef}
                style={{ backgroundColor: colors.surfaceInset }}
                value={name}
              />
              {fieldErrors.name ? (
                <Text className="mt-1.5 text-xs font-semibold text-app-danger">{fieldErrors.name}</Text>
              ) : null}

              <Text className="mb-2 mt-5 text-xs font-bold uppercase tracking-wider text-app-muted">
                Category
              </Text>
              <View className="flex-row flex-wrap justify-between gap-y-2.5">
                {categoryOptions.map((category) => {
                  const selected = category.id === categoryId;
                  return (
                    <Pressable
                      accessibilityRole="radio"
                      accessibilityState={{ selected }}
                      className="flex-row items-center rounded-2xl px-3 py-2.5 active:opacity-80"
                      key={category.id}
                      onPress={() => {
                        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                        setCategoryId(category.id);
                        clearFieldError('category');
                      }}
                      style={{
                        width: '48.5%',
                        backgroundColor: selected ? colors.primarySoft : colors.surfaceInset,
                        borderWidth: 1.5,
                        borderColor: selected ? colors.primary : 'transparent',
                      }}>
                      <CategoryIcon color={category.color} icon={category.icon} />
                      <Text
                        className="ml-2.5 flex-1 text-xs font-bold"
                        numberOfLines={1}
                        style={{ color: selected ? colors.primary : colors.text }}>
                        {category.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              {fieldErrors.category ? (
                <Text className="mt-1.5 text-xs font-semibold text-app-danger">{fieldErrors.category}</Text>
              ) : null}

              <Text className="mb-2 mt-5 text-xs font-bold uppercase tracking-wider text-app-muted">
                Date Type
              </Text>
              <View
                className="flex-row rounded-2xl p-1"
                style={{ backgroundColor: colors.surfaceInset }}>
                {DATE_TYPES.map((option) => {
                  const selected = option.value === dateType;
                  return (
                    <Pressable
                      className="flex-1 rounded-xl py-2 active:opacity-80"
                      key={option.value}
                      onPress={() => {
                        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                        setDateType(option.value);
                      }}
                      style={{
                        backgroundColor: selected ? colors.surface : 'transparent',
                        shadowColor: selected ? '#000' : 'transparent',
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: selected ? 0.08 : 0,
                        shadowRadius: 2,
                        elevation: selected ? 2 : 0,
                      }}>
                      <Text
                        className="text-center text-xs font-bold"
                        style={{ color: selected ? colors.primary : colors.textSecondary }}>
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Section 2: Target Date & Recurrence */}
            <Text className="mb-2 mt-7 text-[11px] font-bold uppercase tracking-[1.5px] text-app-muted">
              Schedule & Timing
            </Text>
            <View
              className="rounded-3xl border p-4"
              style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
              <Text className="mb-2 text-xs font-bold uppercase tracking-wider text-app-muted">
                Target Date
              </Text>
              <Pressable
                accessibilityHint="Opens calendar picker"
                accessibilityLabel={`Target date, ${formatDateForDisplay(targetDate)}`}
                accessibilityRole="button"
                className="flex-row items-center rounded-2xl border px-4 py-3.5 active:opacity-80"
                onPress={() => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                  setShowDatePicker(true);
                }}
                style={{
                  backgroundColor: colors.surfaceInset,
                  borderColor: fieldErrors.targetDate ? colors.danger : colors.border,
                }}>
                <View
                  className="mr-3 h-9 w-9 items-center justify-center rounded-xl"
                  style={{ backgroundColor: colors.primarySoft }}>
                  <CalendarDays color={colors.primary} size={18} strokeWidth={2.2} />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-bold text-app-text">
                    {formatDateForDisplay(targetDate)}
                  </Text>
                  <Text className="text-[11px] font-medium text-app-muted">
                    Tap to adjust date
                  </Text>
                </View>
                <Text className="text-lg text-app-muted">›</Text>
              </Pressable>
              {fieldErrors.targetDate ? (
                <Text className="mt-1.5 text-xs font-semibold text-app-danger">{fieldErrors.targetDate}</Text>
              ) : null}

              {showDatePicker ? (
                <View
                  className={
                    Platform.OS === 'ios'
                      ? 'mt-3 rounded-2xl border border-app-border bg-app-surface p-3'
                      : undefined
                  }>
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
                      className="mt-2 self-end rounded-xl px-4 py-2"
                      onPress={() => setShowDatePicker(false)}
                      style={{ backgroundColor: colors.primarySoft }}>
                      <Text className="text-xs font-bold text-app-primary">Done</Text>
                    </Pressable>
                  ) : null}
                </View>
              ) : null}

              <View className="mt-5 flex-row items-center justify-between border-t pt-4" style={{ borderColor: colors.border }}>
                <View className="mr-4 flex-1">
                  <Text className="text-sm font-bold text-app-text">Repeat Yearly</Text>
                  <Text className="mt-0.5 text-xs text-app-muted">
                    Automatically renew on the same calendar day each year.
                  </Text>
                </View>
                <Switch
                  onValueChange={(val) => {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                    setRepeatsYearly(val);
                  }}
                  thumbColor={repeatsYearly ? colors.primaryFill : colors.surface}
                  trackColor={{ false: colors.border, true: colors.primarySoft }}
                  value={repeatsYearly}
                />
              </View>
            </View>

            {/* Section 3: Importance Priority */}
            <Text className="mb-2 mt-7 text-[11px] font-bold uppercase tracking-[1.5px] text-app-muted">
              Priority
            </Text>
            <View
              className="rounded-3xl border p-4"
              style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
              <View
                className="flex-row rounded-2xl p-1"
                style={{ backgroundColor: colors.surfaceInset }}>
                {IMPORTANCE_OPTIONS.map((option) => {
                  const selected = option === importance;
                  const isHigh = option === 'high';
                  return (
                    <Pressable
                      className="flex-1 rounded-xl py-2.5 active:opacity-80"
                      key={option}
                      onPress={() => {
                        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                        setImportance(option);
                      }}
                      style={{
                        backgroundColor: selected
                          ? isHigh
                            ? colors.danger
                            : colors.primaryFill
                          : 'transparent',
                        shadowColor: selected ? '#000' : 'transparent',
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: selected ? 0.15 : 0,
                        shadowRadius: 2,
                        elevation: selected ? 2 : 0,
                      }}>
                      <Text
                        className="text-center text-xs font-bold capitalize"
                        style={{ color: selected ? '#FFFFFF' : colors.textSecondary }}>
                        {option}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Section 4: Reminders Configuration */}
            <Text className="mb-2 mt-7 text-[11px] font-bold uppercase tracking-[1.5px] text-app-muted">
              Reminders Schedule
            </Text>
            <View
              className="rounded-3xl border p-4"
              style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
              <View className="flex-row items-center justify-between">
                <Text className="text-sm font-bold text-app-text">Notify in advance</Text>
                <View
                  className="rounded-full px-2.5 py-0.5"
                  style={{ backgroundColor: colors.primarySoft }}>
                  <Text className="text-[11px] font-bold text-app-primary">
                    {reminderDays.length} active
                  </Text>
                </View>
              </View>
              <Text className="mt-1 text-xs leading-5 text-app-muted">
                Duewise will alert you at 9:00 AM on each scheduled milestone.
              </Text>

              {/* Preset Chips */}
              <View className="mt-4 flex-row flex-wrap justify-between gap-y-2">
                {REMINDER_PRESETS.map(({ days, label }) => {
                  const selected = reminderDays.includes(days);
                  return (
                    <Pressable
                      accessibilityLabel={days === 0 ? 'Due day' : `${days} days before`}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: selected }}
                      className="flex-row items-center justify-center rounded-2xl border px-3 py-3 active:opacity-75"
                      key={days}
                      onPress={() => {
                        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                        setReminderDays((current) => toggleReminderDay(current, days));
                      }}
                      style={{
                        width: '48.5%',
                        backgroundColor: selected ? colors.primarySoft : colors.surfaceInset,
                        borderColor: selected ? colors.primary : 'transparent',
                      }}>
                      {selected ? (
                        <Check color={colors.primary} size={15} strokeWidth={2.5} style={{ marginRight: 6 }} />
                      ) : null}
                      <Text
                        className="text-xs font-bold"
                        style={{ color: selected ? colors.primary : colors.text }}>
                        {label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Custom reminder day */}
              <View className="mt-5 border-t pt-4" style={{ borderColor: colors.border }}>
                <Text className="text-xs font-bold uppercase tracking-wider text-app-muted">
                  Custom days before
                </Text>
                <View className="mt-2 flex-row gap-2">
                  <TextInput
                    accessibilityLabel="Custom reminder days before"
                    className="min-h-12 flex-1 rounded-2xl border px-4 text-sm font-semibold text-app-text"
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
                    style={{
                      backgroundColor: colors.surfaceInset,
                      borderColor: fieldErrors.reminderDays ? colors.danger : colors.border,
                    }}
                    value={customReminderDay}
                  />
                  <Pressable
                    accessibilityLabel="Add custom reminder day"
                    accessibilityRole="button"
                    className="min-h-12 flex-row items-center rounded-2xl px-5 active:opacity-80"
                    onPress={() => {
                      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                      addCustomReminderDay();
                    }}
                    style={{ backgroundColor: colors.primaryFill }}>
                    <Plus color="#FFFFFF" size={16} strokeWidth={2.5} />
                    <Text className="ml-1 text-xs font-bold text-white">Add</Text>
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
                          className="flex-row items-center rounded-full px-3.5 py-1.5 active:opacity-75"
                          key={day}
                          onPress={() => {
                            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                            setReminderDays((current) => toggleReminderDay(current, day));
                          }}
                          style={{ backgroundColor: colors.primarySoft }}>
                          <Text className="mr-1.5 text-xs font-bold text-app-primary">
                            {day} days
                          </Text>
                          <X color={colors.primary} size={13} strokeWidth={2.5} />
                        </Pressable>
                      ))}
                  </View>
                ) : null}

                {fieldErrors.reminderDays ? (
                  <Text className="mt-1.5 text-xs font-semibold text-app-danger">
                    {fieldErrors.reminderDays}
                  </Text>
                ) : null}
              </View>
            </View>

            {/* Section 5: Notes */}
            <Text className="mb-2 mt-7 text-[11px] font-bold uppercase tracking-[1.5px] text-app-muted">
              Notes (Optional)
            </Text>
            <View
              className="rounded-3xl border p-4"
              style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
              <TextInput
                accessibilityLabel="Notes"
                className="min-h-24 text-sm leading-6 text-app-text"
                multiline
                onChangeText={setNotes}
                onFocus={() => focusInput(notesInputRef.current)}
                placeholder="Policy number, links, renewal contact, or instructions..."
                placeholderTextColor={colors.textSecondary}
                ref={notesInputRef}
                textAlignVertical="top"
                value={notes}
              />
            </View>

            {submissionError ? (
              <Text
                selectable
                className="mt-5 rounded-2xl bg-app-danger-soft p-4 text-xs font-semibold text-app-danger">
                {submissionError}
              </Text>
            ) : null}
          </ScrollView>
        </View>

        {/* Bottom Save Action Bar */}
        <View
          className="border-t px-5 pt-3"
          style={{
            backgroundColor: colors.surface,
            borderColor: colors.border,
            paddingBottom: Math.max(insets.bottom, 14),
          }}>
          <Pressable
            accessibilityRole="button"
            className="items-center justify-center rounded-2xl py-4 active:opacity-85 disabled:opacity-50"
            disabled={isSaving}
            onPress={saveItem}
            style={{
              backgroundColor: colors.primaryFill,
              shadowColor: colors.primary,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.25,
              shadowRadius: 8,
              elevation: 4,
            }}>
            <Text className="text-base font-bold text-white">
              {isSaving ? 'Saving item...' : isEditing ? 'Save Changes' : 'Create Reminder'}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

