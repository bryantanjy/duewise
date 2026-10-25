import { eq } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { DateTimePicker } from '@expo/ui/community/datetime-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { CalendarDays, Check, Clock, X } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { db } from '@/db';

import { categories, items, reminders } from '@/db/schema';
import { DisclosureRow, FormError, FormLabel, FormRow, SelectionSheet } from '@/components/items/ReminderFormControls';
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

import { DEFAULT_REMINDER_TIME, formatReminderTime, reminderDateFor, toStoredTime } from '@/utils/reminder-time';

import { REPEAT_OPTIONS, repeatLabel, type RepeatType } from '@/utils/recurrence';

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
  const { editId, section, date } = useLocalSearchParams<{ editId?: string; section?: string; date?: string }>();
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
  const { data: categoryOptions, error: categoryError } = useLiveQuery(categoryQuery);
  const { data: editItemRows, updatedAt: editItemUpdatedAt, error: editItemError } = useLiveQuery(editItemQuery);
  const { data: editReminderRows, updatedAt: editReminderUpdatedAt, error: editReminderError } = useLiveQuery(editReminderQuery);
  const didHydrateEdit = useRef(false);
  const saveLock = useRef(false);
  const alertsOffset = useRef(0);
  const repeatOffset = useRef(0);
  const didScrollToSchedule = useRef(false);
  const scheduleOffset = useRef<number | undefined>(undefined);
  const viewportRef = useRef<View>(null);
  const scrollRef = useRef<ScrollView>(null);
  const nameInputRef = useRef<TextInput>(null);
  const reminderInputRef = useRef<TextInput>(null);
  const repeatInputRef = useRef<TextInput>(null);
  const notesInputRef = useRef<TextInput>(null);
  const focusedInput = useRef<TextInput | null>(null);
  const scrollOffset = useRef(0);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [name, setName] = useState('');
  const [categoryOverride, setCategoryId] = useState<number>();
  const categoryId = categoryOverride ?? categoryOptions[0]?.id;
  const [dateType, setDateType] = useState<(typeof DATE_TYPES)[number]['value']>('expiry');
  const [targetDate, setTargetDate] = useState(() => {
    if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      const parsed = parseStoredDate(date);
      if (parsed && !Number.isNaN(parsed.getTime()) && toStoredDate(parsed) === date) return date;
    }
    return initialTargetDate();
  });
  const [reminderTime, setReminderTime] = useState(DEFAULT_REMINDER_TIME);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [importance, setImportance] = useState<(typeof IMPORTANCE_OPTIONS)[number]>('normal');
  const [repeatType, setRepeatType] = useState<RepeatType>('yearly');
  const [repeatInterval, setRepeatInterval] = useState('1');
  const [reminderDays, setReminderDays] = useState<number[]>(DEFAULT_REMINDER_DAYS);
  const [customReminderDay, setCustomReminderDay] = useState('');
  const [notes, setNotes] = useState('');
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<ItemFormField, string>>
  >({});
  const [submissionError, setSubmissionError] = useState<string>();
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selection, setSelection] = useState<'category' | 'repeat' | 'dateType'>();
  const [showAlerts, setShowAlerts] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [intervalError, setIntervalError] = useState<string>();
  const editReady = !isEditing || Boolean(editItemRows[0] && editItemUpdatedAt && editReminderUpdatedAt);
  const loadError = categoryError ?? editItemError ?? editReminderError;
  const missingEditItem = isEditing && editItemUpdatedAt && editItemRows.length === 0;



  const scrollFocusedInputIntoView = useCallback(() => {
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
  }, []);

  const scheduleFocusedInputScroll = useCallback(() => {
    requestAnimationFrame(() => requestAnimationFrame(scrollFocusedInputIntoView));
  }, [scrollFocusedInputIntoView]);

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
  }, [scheduleFocusedInputScroll]);


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
    const item = editItemRows[0];
    if (!isEditing || !item || !editItemUpdatedAt || !editReminderUpdatedAt || didHydrateEdit.current) return;

    didHydrateEdit.current = true;
    setName(item.name);
    setCategoryId(item.categoryId ?? categoryOptions[0]?.id);
    setDateType(item.dateType as (typeof DATE_TYPES)[number]['value']);
    setTargetDate(item.targetDate);
    setReminderTime(item.reminderTime);
    setImportance(item.importance as (typeof IMPORTANCE_OPTIONS)[number]);
    setRepeatType(item.repeatType as RepeatType);
    setRepeatInterval(String(item.repeatInterval));
    setReminderDays(normalizeReminderDays(editReminderRows.filter((row) => !row.isSnooze).map(({ daysBefore }) => daysBefore)));
    setNotes(item.notes ?? '');
  }, [categoryOptions, editItemRows, editItemUpdatedAt, editReminderRows, editReminderUpdatedAt, isEditing]);

  const scrollToSchedule = useCallback(() => {
    if (section !== 'schedule' || !didHydrateEdit.current || didScrollToSchedule.current || scheduleOffset.current === undefined) return;
    didScrollToSchedule.current = true;
    scrollRef.current?.scrollTo({ y: Math.max(0, scheduleOffset.current - 12), animated: false });
  }, [section]);
  useEffect(() => {
    const frame = requestAnimationFrame(scrollToSchedule);
    return () => cancelAnimationFrame(frame);
  }, [scrollToSchedule, editItemUpdatedAt, editReminderUpdatedAt]);

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
    if (isSaving || saveLock.current || !editReady || loadError) return;
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
    if (validation.fieldErrors.reminderDays) setShowAlerts(true);
    if (Object.keys(validation.fieldErrors).length > 0 || categoryId === undefined) {
      if (validation.fieldErrors.name) {
        scrollRef.current?.scrollTo({ y: 0, animated: false });
        requestAnimationFrame(() => nameInputRef.current?.focus());
      } else if (validation.fieldErrors.targetDate) scrollToOffset(scheduleOffset.current ?? 0);
      else if (validation.fieldErrors.reminderDays) { setShowAlerts(true); scrollToOffset(alertsOffset.current); }
      return;
    }

    if (repeatType === 'custom' && (!/^\d+$/.test(repeatInterval) || Number(repeatInterval) < 1 || Number(repeatInterval) > 3650)) {
      setIntervalError('Choose a repeat interval from 1 to 3650 days.');
      scrollToOffset(repeatOffset.current);
      return;
    }
    saveLock.current = true;
    Keyboard.dismiss();
    setIsSaving(true);
    try {
      const input = {
        categoryId,
        dateType,
        importance,
        name,
        notes,
        reminderDays: validation.parsedReminderDays ?? [],
        repeatType,
        repeatInterval: repeatType === 'custom' ? Number(repeatInterval) : 1,
        targetDate,
        reminderTime,
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
      saveLock.current = false;
      setIsSaving(false);
    }
  }

  function scrollToOffset(offset: number) {
    requestAnimationFrame(() => requestAnimationFrame(() => scrollRef.current?.scrollTo({ y: Math.max(0, offset - 12), animated: false })));
  }
  function openSelection(next: 'category' | 'repeat' | 'dateType') {
    Keyboard.dismiss(); focusedInput.current = null;
    setShowDatePicker(false); setShowTimePicker(false); setSelection(next);
  }
  function toggleOptional(field: 'alerts' | 'notes') {
    Keyboard.dismiss(); focusedInput.current = null;
    if (field === 'alerts') setShowAlerts(!showAlerts); else setShowNotes(!showNotes);
  }
  const selectedCategory = categoryOptions.find((category) => category.id === categoryId);
  const alertsSummary = reminderDays.length ? reminderDays.map((day) => day === 0 ? 'due date' : `${day}d`).join(', ') : 'No alerts selected';
  const panel = { borderWidth: 1, borderColor: colors.border, borderRadius: 14, backgroundColor: colors.surface, overflow: 'hidden' as const };
  const inputStyle = { minHeight: 52, borderWidth: 1, borderColor: colors.border, borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 13, fontSize: 15, lineHeight: 23, color: colors.text, backgroundColor: colors.surface };
  const selectionOptions = selection === 'category'
    ? categoryOptions.map((category) => ({ value: category.id as string | number, label: category.name, icon: <CategoryIcon icon={category.icon} color={category.color} /> }))
    : selection === 'repeat' ? REPEAT_OPTIONS.map((option) => ({ value: option.value as string | number, label: option.label }))
    : DATE_TYPES.map((option) => ({ value: option.value as string | number, label: option.label }));

  return <View style={{ flex: 1, paddingTop: insets.top, backgroundColor: colors.homeBackground }}>
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <View style={{ paddingHorizontal: 22, paddingVertical: 6, width: '100%', maxWidth: 684, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Cancel and go back" onPress={() => router.back()} style={{ minHeight: 48, minWidth: 56, justifyContent: 'center' }}>
          <Text style={{ fontSize: 14, color: colors.textSecondary }}>Cancel</Text>
        </Pressable>
        <Text accessibilityRole="header" style={{ flex: 1, textAlign: 'center', fontSize: 17, lineHeight: 25, fontWeight: '600', color: colors.text, letterSpacing: -0.3 }}>{isEditing ? 'Edit reminder' : 'New reminder'}</Text>
        {keyboardVisible ? <Pressable accessibilityRole="button" accessibilityLabel="Dismiss keyboard" onPress={Keyboard.dismiss} style={{ minHeight: 48, minWidth: 56, alignItems: 'flex-end', justifyContent: 'center' }}>
          <Text style={{ fontSize: 14, color: colors.primary }}>Done</Text>
        </Pressable> : <View style={{ width: 56 }} />}
      </View>
      <View ref={viewportRef} style={{ flex: 1 }}>
        <ScrollView ref={scrollRef} style={{ flex: 1 }} showsVerticalScrollIndicator={false}
          keyboardDismissMode="on-drag" keyboardShouldPersistTaps="handled" scrollEventThrottle={16}
          onScroll={(event) => { scrollOffset.current = event.nativeEvent.contentOffset.y; }}
          onLayout={() => { if (keyboardVisible) scheduleFocusedInputScroll(); }}
          onContentSizeChange={() => { if (keyboardVisible) scheduleFocusedInputScroll(); }}
          contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 14, paddingBottom: 30 }}>
          <View style={{ width: '100%', maxWidth: 640, alignSelf: 'center' }}>
            {loadError || missingEditItem ? <Text accessibilityRole="alert" style={{ fontSize: 13, lineHeight: 21, color: colors.danger, marginBottom: 16 }}>{missingEditItem ? 'This reminder no longer exists. Go back to your reminders.' : 'Unable to load the form. Go back and try again.'}</Text> : null}
            <FormLabel>Name</FormLabel>
            <TextInput ref={nameInputRef} accessibilityLabel="Item name" value={name} placeholder="e.g. Passport renewal"
              placeholderTextColor={colors.textSecondary} returnKeyType="done" onFocus={() => focusInput(nameInputRef.current)}
              onChangeText={(value) => { setName(value); clearFieldError('name'); }}
              style={{ ...inputStyle, fontSize: 17, fontWeight: '500', borderColor: fieldErrors.name ? colors.danger : colors.border }} />
            <FormError message={fieldErrors.name} />
            <View style={{ ...panel, marginTop: 16 }}>
              <FormRow label="Category" value={selectedCategory?.name ?? 'Choose a category'}
                icon={selectedCategory ? <CategoryIcon color={selectedCategory.color} icon={selectedCategory.icon} /> : undefined}
                onPress={() => openSelection('category')} error={Boolean(fieldErrors.category)} />
            </View>
            <FormError message={fieldErrors.category} />

            <View onLayout={(event) => { scheduleOffset.current = event.nativeEvent.layout.y; scrollToSchedule(); }} style={{ marginTop: 26 }}>
              <FormHeading>When</FormHeading>
              <View style={panel}>
                <FormRow label="Date" value={formatDateForDisplay(targetDate)} icon={<CalendarDays size={18} color={colors.textSecondary} strokeWidth={1.7} />}
                  error={Boolean(fieldErrors.targetDate)} onPress={() => { Keyboard.dismiss(); setShowTimePicker(false); setShowDatePicker(true); }} />
                <FormRow label="Reminder time" value={formatReminderTime(reminderTime)} icon={<Clock size={18} color={colors.textSecondary} strokeWidth={1.7} />}
                  divider onPress={() => { Keyboard.dismiss(); setShowDatePicker(false); setShowTimePicker(true); }} />
                <FormRow label="Date type" value={DATE_TYPES.find((option) => option.value === dateType)?.label ?? 'Custom'} divider onPress={() => openSelection('dateType')} />
              </View>
              <FormError message={fieldErrors.targetDate} />
              <Text style={{ marginTop: 8, fontSize: 12, lineHeight: 19, color: colors.textSecondary }}>Each alert uses this time, in your local time zone.{Platform.OS === 'android' ? ' Android may deliver it later, especially while the phone is idle.' : ''}</Text>
              {showDatePicker || showTimePicker ? <View style={Platform.OS === 'ios' ? { ...panel, padding: 12, marginTop: 12 } : undefined}>
                <DateTimePicker accentColor={colors.primaryFill} mode={showTimePicker ? 'time' : 'date'}
                  display={Platform.OS === 'ios' ? showTimePicker ? 'spinner' : 'inline' : 'default'}
                  presentation="dialog" themeVariant={resolvedTheme}
                  value={showTimePicker ? reminderDateFor(targetDate, 0, reminderTime) : parseStoredDate(targetDate) ?? new Date()}
                  onDismiss={() => { setShowDatePicker(false); setShowTimePicker(false); }}
                  onValueChange={(_, value) => {
                    if (showTimePicker) setReminderTime(toStoredTime(value));
                    else { setTargetDate(toStoredDate(value)); clearFieldError('targetDate'); }
                    if (Platform.OS !== 'ios') { setShowDatePicker(false); setShowTimePicker(false); }
                  }} />
                {Platform.OS === 'ios' ? <Pressable accessibilityRole="button" onPress={() => { setShowDatePicker(false); setShowTimePicker(false); }}
                  style={{ minHeight: 48, alignSelf: 'flex-end', paddingHorizontal: 16, justifyContent: 'center' }}><Text style={{ color: colors.primary, fontSize: 14 }}>Done</Text></Pressable> : null}
              </View> : null}
            </View>

            <View onLayout={(event) => { repeatOffset.current = event.nativeEvent.layout.y; }} style={{ marginTop: 26 }}>
              <FormHeading>Repeat & priority</FormHeading>
              <View style={panel}><FormRow label="Repeat" value={repeatLabel(repeatType, Number(repeatInterval) || 1)} onPress={() => openSelection('repeat')} /></View>
              {repeatType === 'custom' ? <View style={{ marginTop: 14 }}>
                <FormLabel>Repeat every (days, 1-3650)</FormLabel>
                <TextInput ref={repeatInputRef} accessibilityLabel="Repeat interval in days" keyboardType="number-pad" value={repeatInterval} maxLength={4}
                  onFocus={() => focusInput(repeatInputRef.current)} onChangeText={(value) => { setRepeatInterval(value); setIntervalError(undefined); }}
                  style={{ ...inputStyle, borderColor: intervalError ? colors.danger : colors.border }} />
                <FormError message={intervalError} />
              </View> : null}
              <Text style={{ marginTop: 8, fontSize: 12, lineHeight: 19, color: colors.textSecondary }}>{repeatType === 'none' ? 'Marking done moves this reminder to your archive.' : 'Mark done to schedule the next occurrence. Missed dates are skipped.'}</Text>
              <View style={{ marginTop: 18 }}><FormLabel>Priority</FormLabel>
                <View accessibilityRole="radiogroup" accessibilityLabel="Priority" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {IMPORTANCE_OPTIONS.map((option) => <Pressable key={option} accessibilityRole="radio" accessibilityState={{ selected: importance === option }}
                    onPress={() => setImportance(option)} style={({ pressed }) => ({ flex: 1, minHeight: 48, minWidth: 70, padding: 10, justifyContent: 'center', alignItems: 'center', borderRadius: 12, borderWidth: 1,
                      borderColor: importance === option ? colors.primary : colors.border, backgroundColor: importance === option ? colors.primarySoft : pressed ? colors.surfaceInset : colors.surface })}>
                    <Text style={{ fontSize: 13, lineHeight: 20, textTransform: 'capitalize', color: importance === option ? colors.primary : colors.text }}>{option}</Text>
                  </Pressable>)}
                </View>
              </View>
            </View>

            <View onLayout={(event) => { alertsOffset.current = event.nativeEvent.layout.y; }} style={{ ...panel, marginTop: 26 }}>
              <DisclosureRow title="Alerts" summary={`${alertsSummary}${customReminderDay.trim() ? ' / custom day pending' : ''}`}
                expanded={showAlerts} onPress={() => toggleOptional('alerts')} />
              {showAlerts ? <View style={{ paddingHorizontal: 16, paddingBottom: 18 }}>
                <Text style={{ fontSize: 12, lineHeight: 19, color: colors.textSecondary, marginBottom: 12 }}>Choose when to be notified before the due date. Leave all options off for no alerts.</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {REMINDER_PRESETS.map(({ days, label }) => {
                    const selected = reminderDays.includes(days);
                    return <Pressable key={days} accessibilityRole="checkbox" accessibilityLabel={days === 0 ? 'Due day' : `${days} days before`}
                      accessibilityState={{ checked: selected }} onPress={() => { setReminderDays((current) => toggleReminderDay(current, days)); clearFieldError('reminderDays'); }}
                      style={({ pressed }) => ({ minHeight: 48, paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 12, borderWidth: 1,
                        borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? colors.primarySoft : pressed ? colors.surfaceInset : colors.surface })}>
                      {selected ? <Check size={14} color={colors.primary} /> : null}<Text style={{ fontSize: 13, lineHeight: 20, color: selected ? colors.primary : colors.text }}>{label}</Text>
                    </Pressable>;
                  })}
                </View>
                <View style={{ marginTop: 18 }}><FormLabel>Custom days before</FormLabel>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <TextInput ref={reminderInputRef} accessibilityLabel="Custom reminder days before" keyboardType="number-pad" value={customReminderDay} placeholder="e.g. 60"
                      placeholderTextColor={colors.textSecondary} onFocus={() => focusInput(reminderInputRef.current)}
                      onChangeText={(value) => { setCustomReminderDay(value); clearFieldError('reminderDays'); }}
                      style={{ ...inputStyle, flex: 1, minWidth: 0, minHeight: 48, borderColor: fieldErrors.reminderDays ? colors.danger : colors.border }} />
                    <Pressable accessibilityRole="button" accessibilityLabel="Add custom reminder day" onPress={addCustomReminderDay}
                      style={({ pressed }) => ({ minHeight: 48, paddingHorizontal: 15, justifyContent: 'center', borderRadius: 12, backgroundColor: colors.primarySoft, opacity: pressed ? 0.7 : 1 })}>
                      <Text style={{ fontSize: 13, color: colors.primary }}>Add</Text>
                    </Pressable>
                  </View>
                </View>
                {reminderDays.filter((day) => !REMINDER_PRESETS.some((preset) => preset.days === day)).length ? <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                  {reminderDays.filter((day) => !REMINDER_PRESETS.some((preset) => preset.days === day)).map((day) => <Pressable key={day} accessibilityRole="button" accessibilityLabel={`Remove reminder ${day} days before`}
                    onPress={() => setReminderDays((current) => toggleReminderDay(current, day))}
                    style={{ minHeight: 48, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, backgroundColor: colors.primarySoft }}>
                    <Text style={{ fontSize: 13, color: colors.primary }}>{day} days</Text><X size={14} color={colors.primary} />
                  </Pressable>)}
                </View> : null}
                <FormError message={fieldErrors.reminderDays} />
              </View> : null}
              <DisclosureRow title="Notes" summary={notes.trim() ? 'Notes added / tap to view or edit' : 'Policy numbers, links, or extra details'} expanded={showNotes} onPress={() => toggleOptional('notes')} divider />
              {showNotes ? <View style={{ paddingHorizontal: 16, paddingBottom: 18 }}>
                <TextInput ref={notesInputRef} accessibilityLabel="Notes" multiline value={notes} onChangeText={setNotes} onFocus={() => focusInput(notesInputRef.current)}
                  placeholder="Anything else you would like to keep with this reminder..." placeholderTextColor={colors.textSecondary} textAlignVertical="top"
                  style={{ ...inputStyle, minHeight: 112, fontSize: 14, lineHeight: 24 }} />
              </View> : null}
            </View>
            {submissionError ? <View style={{ marginTop: 18 }}><FormError message={submissionError} /></View> : null}
          </View>
        </ScrollView>
      </View>
      <View style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingHorizontal: 22, paddingTop: 12, paddingBottom: Math.max(insets.bottom, 12), backgroundColor: colors.homeBackground }}>
        <Pressable accessibilityRole="button" accessibilityState={{ disabled: isSaving || !editReady || Boolean(loadError) || categoryOptions.length === 0, busy: isSaving }}
          disabled={isSaving || !editReady || Boolean(loadError) || categoryOptions.length === 0} onPress={saveItem}
          style={({ pressed }) => ({ width: '100%', maxWidth: 640, alignSelf: 'center', minHeight: 52, paddingVertical: 13, paddingHorizontal: 18, borderRadius: 14, flexDirection: 'row', gap: 9, justifyContent: 'center', alignItems: 'center',
            backgroundColor: colors.primaryFill, opacity: isSaving || !editReady || loadError || categoryOptions.length === 0 ? 0.5 : pressed ? 0.85 : 1 })}>
          {isSaving ? <ActivityIndicator color={colors.onPrimary} size="small" /> : null}
          <Text style={{ fontSize: 15, lineHeight: 23, fontWeight: '600', color: colors.onPrimary }}>{isSaving ? 'Saving...' : isEditing ? 'Save changes' : 'Create reminder'}</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
    <SelectionSheet title={selection === 'category' ? 'Choose category' : selection === 'repeat' ? 'Repeat' : 'Date type'} visible={Boolean(selection)}
      options={selectionOptions} value={selection === 'category' ? categoryId : selection === 'repeat' ? repeatType : dateType} columns={selection === 'category'}
      onClose={() => setSelection(undefined)} onSelect={(value) => {
        if (selection === 'category') { setCategoryId(Number(value)); clearFieldError('category'); }
        else if (selection === 'repeat') { setRepeatType(value as RepeatType); setIntervalError(undefined); }
        else setDateType(value as typeof dateType);
        setSelection(undefined);
      }} />
  </View>;
}
function FormHeading({ children }: { children: React.ReactNode }) {
  const colors = useTheme();
  return <Text accessibilityRole="header" style={{ marginBottom: 12, fontSize: 17, lineHeight: 25, fontWeight: '600', letterSpacing: -0.3, color: colors.text }}>{children}</Text>;
}
