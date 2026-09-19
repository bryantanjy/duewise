import { eq } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import DateTimePicker from '@expo/ui/community/datetime-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { CalendarDays } from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
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
import { Colors } from '@/constants/theme';
import { createItem, updateItem } from '@/services/items';
import {
  formatDateForDisplay,
  parseStoredDate,
  toStoredDate,
  validateItemForm,
  type ItemFormField,
} from '@/utils/item-form';

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
  const { data: editItemRows } = useLiveQuery(editItemQuery);
  const { data: editReminderRows } = useLiveQuery(editReminderQuery);
  const didHydrateEdit = useRef(false);
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState<number>();
  const [dateType, setDateType] = useState<(typeof DATE_TYPES)[number]['value']>('expiry');
  const [targetDate, setTargetDate] = useState(initialTargetDate);
  const [importance, setImportance] = useState<(typeof IMPORTANCE_OPTIONS)[number]>('normal');
  const [repeatsYearly, setRepeatsYearly] = useState(true);
  const [reminderDays, setReminderDays] = useState('30, 7, 1, 0');
  const [notes, setNotes] = useState('');
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<ItemFormField, string>>
  >({});
  const [submissionError, setSubmissionError] = useState<string>();
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

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
    if (!isEditing || !item || didHydrateEdit.current) return;

    didHydrateEdit.current = true;
    setName(item.name);
    setCategoryId(item.categoryId ?? categoryOptions[0]?.id);
    setDateType(item.dateType as (typeof DATE_TYPES)[number]['value']);
    setTargetDate(item.targetDate);
    setImportance(item.importance as (typeof IMPORTANCE_OPTIONS)[number]);
    setRepeatsYearly(item.repeatType === 'yearly');
    setReminderDays(
      editReminderRows
        .map(({ daysBefore }) => daysBefore)
        .sort((left, right) => right - left)
        .join(', '),
    );
    setNotes(item.notes ?? '');
  }, [categoryOptions, editItemRows, editReminderRows, isEditing]);

  async function saveItem() {
    if (isSaving) return;
    setSubmissionError(undefined);

    const validation = validateItemForm({ categoryId, name, reminderDays, targetDate });
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
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
        style={{ flex: 1 }}>
        <View className="flex-row items-center justify-between px-5 py-2">
          <Pressable className="py-2 pr-4" onPress={() => router.back()}>
            <Text className="text-base font-semibold text-app-primary">Cancel</Text>
          </Pressable>
          <Text className="text-xl font-bold text-app-text">
            {isEditing ? 'Edit item' : 'Add item'}
          </Text>
          <View className="w-14" />
        </View>

        <ScrollView
          contentContainerStyle={{ paddingBottom: 32, paddingHorizontal: 20, paddingTop: 12 }}
          keyboardShouldPersistTaps="handled"
          style={{ flex: 1 }}>
        <Text className="mb-2 mt-8 text-sm font-semibold text-app-text">Name</Text>
        <TextInput
          accessibilityLabel="Item name"
          className={`rounded-2xl border bg-app-surface px-4 py-4 text-base text-app-text ${fieldErrors.name ? 'border-app-danger' : 'border-app-border'}`}
          onChangeText={(value) => {
            setName(value);
            clearFieldError('name');
          }}
          placeholder="e.g. Car road tax"
          placeholderTextColor="#9A9A9A"
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
            <CalendarDays color={Colors.light.primary} size={21} strokeWidth={2} />
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
              accentColor={Colors.light.primary}
              display={Platform.OS === 'ios' ? 'inline' : 'default'}
              mode="date"
              onDismiss={() => setShowDatePicker(false)}
              onValueChange={(_, selectedDate) => {
                setTargetDate(toStoredDate(selectedDate));
                clearFieldError('targetDate');
                if (Platform.OS !== 'ios') setShowDatePicker(false);
              }}
              presentation="dialog"
              themeVariant="light"
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
            trackColor={{ false: Colors.light.border, true: '#8E88FF' }}
            thumbColor={repeatsYearly ? Colors.light.primary : Colors.light.surface}
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

        <Text className="mb-2 mt-6 text-sm font-semibold text-app-text">Reminder days</Text>
        <TextInput
          accessibilityLabel="Reminder days"
          className={`rounded-2xl border bg-app-surface px-4 py-4 text-base text-app-text ${fieldErrors.reminderDays ? 'border-app-danger' : 'border-app-border'}`}
          keyboardType="numeric"
          onChangeText={(value) => {
            setReminderDays(value);
            clearFieldError('reminderDays');
          }}
          placeholder="30, 7, 1, 0"
          placeholderTextColor="#9A9A9A"
          value={reminderDays}
        />
        <Text className="mt-2 text-xs leading-5 text-app-muted">
          Comma-separated days before the date. Use 0 for the due date, or leave blank for none.
        </Text>
        {fieldErrors.reminderDays ? (
          <Text className="mt-2 text-sm text-app-danger">{fieldErrors.reminderDays}</Text>
        ) : null}

        <Text className="mb-2 mt-6 text-sm font-semibold text-app-text">Notes (optional)</Text>
        <TextInput
          className="min-h-28 rounded-2xl border border-app-border bg-app-surface px-4 py-4 text-base text-app-text"
          multiline
          onChangeText={setNotes}
          placeholder="Policy number, renewal instructions, or anything useful"
          placeholderTextColor="#9A9A9A"
          textAlignVertical="top"
          value={notes}
        />

        {submissionError ? (
          <Text selectable className="mt-5 rounded-2xl bg-app-danger-soft p-4 text-sm text-app-danger">
            {submissionError}
          </Text>
        ) : null}

        </ScrollView>

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
