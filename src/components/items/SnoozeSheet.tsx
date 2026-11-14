import { useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { DateTimePicker } from '@expo/ui/community/datetime-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/use-theme';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { resolveSnoozeDate, type SnoozeChoice } from '@/utils/snooze';
import { FormError, FormRow } from './ReminderFormControls';
import Button from '@/components/ui/Button';

export default function SnoozeSheet({ reminderTime, onClose, onConfirm }: {
  reminderTime: string; onClose: () => void; onConfirm: (choice: SnoozeChoice) => void;
}) {
  const colors = useTheme();
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const [custom, setCustom] = useState(false);
  const [date, setDate] = useState(() => resolveSnoozeDate('tomorrow', reminderTime));
  const [picker, setPicker] = useState<'date' | 'time'>();
  const [error, setError] = useState<string>();
  const format = (value: Date) => value.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  const confirm = (choice: SnoozeChoice) => {
    try { resolveSnoozeDate(choice, reminderTime); onConfirm(choice); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Choose a future date and time.'); }
  };
  return <Modal visible transparent animationType={reducedMotion ? 'none' : 'slide'} onRequestClose={onClose}>
    <View style={{ flex: 1, paddingTop: insets.top + 20, justifyContent: 'flex-end' }}>
      <Pressable accessibilityRole="button" accessibilityLabel="Close snooze options" onPress={onClose}
        style={{ position: 'absolute', inset: 0, backgroundColor: colors.shadow, opacity: 0.65 }} />
      <View accessibilityViewIsModal style={{ maxHeight: '100%', backgroundColor: colors.surfaceRaised, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: Math.max(16, insets.bottom) }}>
        <View style={{ paddingLeft: 22, paddingRight: 12, paddingTop: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text accessibilityRole="header" style={{ flex: 1, fontSize: 19, lineHeight: 27, fontWeight: '600', color: colors.text }}>Snooze reminder</Text>
          <Pressable accessibilityRole="button" onPress={onClose} style={{ minWidth: 60, minHeight: 48, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: colors.primary, fontSize: 14 }}>Cancel</Text>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 10, paddingBottom: 16 }}>
          <Text style={{ color: colors.textSecondary, fontSize: 13, lineHeight: 21, marginBottom: 14 }}>Adds an extra alert. Your due date and regular alerts stay the same.</Text>
          {(['hour', 'tomorrow', 'week'] as const).map((choice) => <FormRow key={choice}
            label={choice === 'hour' ? 'In 1 hour' : choice === 'tomorrow' ? 'Tomorrow' : 'Next week'}
            value={format(resolveSnoozeDate(choice, reminderTime))} onPress={() => confirm(choice)} divider />)}
          <FormRow label="Choose date and time" value={custom ? format(date) : 'Set a custom snooze'} divider
            onPress={() => { setCustom(true); setPicker('date'); }} />
          {custom ? <View style={{ marginTop: 12 }}>
            <FormRow label="Date" value={date.toLocaleDateString(undefined, { dateStyle: 'long' })} onPress={() => setPicker('date')} />
            <FormRow label="Time" value={date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })} onPress={() => setPicker('time')} />
            {picker ? <DateTimePicker mode={picker} value={date} minimumDate={picker === 'date' ? new Date() : undefined}
              display={Platform.OS === 'ios' ? 'spinner' : 'default'} accentColor={colors.primaryFill}
              onDismiss={() => setPicker(undefined)} onValueChange={(_event, nextDate) => {
                const next = new Date(date);
                if (picker === 'date') next.setFullYear(nextDate.getFullYear(), nextDate.getMonth(), nextDate.getDate());
                else next.setHours(nextDate.getHours(), nextDate.getMinutes(), 0, 0);
                setDate(next); setError(undefined);
                if (Platform.OS !== 'ios') setPicker(undefined);
              }} /> : null}
            {Platform.OS === 'ios' && picker ? <Button title="Done choosing" variant="ghost" onPress={() => setPicker(undefined)} /> : null}
            <FormError message={error} />
            <Button title="Snooze until selected time" fullWidth onPress={() => confirm(date)} style={{ marginTop: 14 }} />
          </View> : <FormError message={error} />}
        </ScrollView>
      </View>
    </View>
  </Modal>;
}
