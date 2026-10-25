import { useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, Text, View, useWindowDimensions } from 'react-native';
import Check from 'lucide-react-native/icons/check';
import Clock from 'lucide-react-native/icons/clock';
import Pencil from 'lucide-react-native/icons/pencil';
import Calendar from 'lucide-react-native/icons/calendar';
import Archive from 'lucide-react-native/icons/archive';
import Trash from 'lucide-react-native/icons/trash';
import ChevronDown from 'lucide-react-native/icons/chevron-down';
import ChevronUp from 'lucide-react-native/icons/chevron-up';
import { useTheme } from '@/hooks/use-theme';
import { daysUntil } from '@/utils/dates';
import { formatDateForDisplay } from '@/utils/item-form';
import { formatReminderTime, reminderDateFor } from '@/utils/reminder-time';
import { repeatLabel } from '@/utils/recurrence';
import { alertScheduleStatus, isMissingFutureAlert, type ReminderDeviceStatus } from '@/utils/reminder-status';
import type { buildRenewalHistoryModel } from '@/utils/item-history-model';

export type DetailItem = {
  id: number; name: string; categoryName: string | null; categoryColor: string | null;
  targetDate: string; reminderTime: string; repeatType: string; repeatInterval: number;
  dateType: string; importance: string; archived: boolean; notes: string | null;
};
export type DetailReminder = { id: number; daysBefore: number; notificationId: string | null; isSnooze: boolean; enabled: boolean };
export type DetailAction = 'complete' | 'restore' | 'snooze' | 'refresh' | 'archive' | 'delete';
type Props = {
  item: DetailItem; reminders: DetailReminder[]; history: NonNullable<ReturnType<typeof buildRenewalHistoryModel>>[];
  deviceStatus?: ReminderDeviceStatus; nextReminder?: string; activeAction?: DetailAction;
  error?: string; message?: string;
  onComplete: () => void; onRestore: () => void; onEdit: () => void; onReschedule: () => void;
  onCheckSchedule: () => void; onSnooze: () => void; onRefresh: () => void; onSettings: () => void; onArchive: () => void; onDelete: () => void;
};

export default function ItemDetailsContent(props: Props) {
  const { item, reminders, history, deviceStatus, nextReminder, activeAction } = props;
  const colors = useTheme();
  const { fontScale } = useWindowDimensions();
  const [showSchedule, setShowSchedule] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);
  const busy = Boolean(activeAction);
  const days = daysUntil(item.targetDate);
  const dueStatus = item.archived ? 'Archived' : days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? 'Due today' : days === 1 ? 'Tomorrow' : `In ${days} days`;
  const dueColor = item.archived ? colors.textSecondary : days < 0 ? colors.danger : days <= 7 ? colors.warning : colors.textSecondary;
  const repeat = repeatLabel(item.repeatType, item.repeatInterval);
  const schedule = reminders.map(row => {
    const queued = deviceStatus?.notifications.find(entry => entry.id === row.notificationId);
    const scheduledFor = queued?.scheduledFor ?? (!row.isSnooze ? reminderDateFor(item.targetDate, row.daysBefore, item.reminderTime).toISOString() : undefined);
    const input = { ...row, scheduledFor, archived: item.archived, deviceStatus, now };
    return { ...row, scheduledFor, status: alertScheduleStatus(input), missing: isMissingFutureAlert(input) };
  });
  const hasUnscheduled = schedule.some(row => row.missing);
  const hasFutureConfigured = schedule.some(row => row.enabled && !row.isSnooze && row.scheduledFor && Date.parse(row.scheduledFor) > now);
  const hasEnabled = reminders.some(row => row.enabled && !row.isSnooze);
  const nextAlert = nextReminder && deviceStatus?.state === 'ready' && !item.archived ? nextReminder : undefined;
  const repeatDescription = item.repeatType === 'none' ? 'One-time reminder. Mark it done to move it to your archive.'
    : `Repeats ${item.repeatType === 'custom' ? `every ${item.repeatInterval} ${item.repeatInterval === 1 ? 'day' : 'days'}` : repeat.toLowerCase()} after you mark it complete. The next due date follows the current schedule; missed dates are skipped.`;
  const scheduleMessage = item.archived ? 'Alerts are paused while this item is archived.'
    : !deviceStatus ? 'Checking the notification schedule...'
    : deviceStatus.state === 'blocked' ? deviceStatus.blockedReason === 'channel' ? 'The Duewise reminders channel is turned off.' : deviceStatus.blockedReason === 'channel-missing' ? 'The reminder channel needs to be set up on this phone.' : 'Notifications are disabled on this device.'
    : deviceStatus.state === 'unsupported' ? 'Notifications are unavailable in this environment.'
    : deviceStatus.state === 'error' ? 'The notification schedule could not be verified.'
    : nextAlert ? new Date(nextAlert).toLocaleString(undefined, { dateStyle: 'full', timeStyle: 'short' })
    : !hasEnabled ? 'No reminder days are enabled.'
    : hasUnscheduled ? 'A future alert is missing from this phone.'
    : 'No upcoming alert is scheduled.';
  const panel = { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 16 };

  return <View>
    <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
      <View style={{ height: 6, width: 6, borderRadius: 3, backgroundColor: item.categoryColor ?? colors.primary }} />
      <Text style={{ fontSize: 13, lineHeight: 20, color: colors.textSecondary }}>{item.categoryName ?? 'Uncategorized'}</Text>
      {item.importance === 'high' ? <Text style={{ fontSize: 12, color: colors.danger }}> / High priority</Text> : null}
    </View>
    <Text accessibilityRole="header" selectable style={{ fontSize: 30, lineHeight: 39, fontWeight: '600', letterSpacing: -0.8, color: colors.text, marginTop: 9 }}>{item.name}</Text>

    <View style={{ ...panel, padding: 20, marginTop: 22 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8 }}>
        <Text style={{ fontSize: 12, lineHeight: 19, color: colors.textSecondary }}>Due date</Text>
        <Text style={{ fontSize: 12, lineHeight: 19, fontWeight: '500', color: dueColor }}>{dueStatus}</Text>
      </View>
      <Text style={{ marginTop: 7, fontSize: 25, lineHeight: 33, letterSpacing: -0.6, fontWeight: '500', color: colors.text }}>{formatDateForDisplay(item.targetDate)}</Text>
      <View style={{ borderTopWidth: 1, borderTopColor: colors.border, marginTop: 17, paddingTop: 14, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Clock size={16} color={colors.textSecondary} strokeWidth={1.7} />
          <Text style={{ fontSize: 13, lineHeight: 20, color: colors.textSecondary }}>Reminder time</Text>
        </View>
        <Text style={{ fontSize: 16, lineHeight: 23, fontWeight: '500', color: colors.text }}>{formatReminderTime(item.reminderTime)}</Text>
      </View>
      <Text style={{ marginTop: 12, fontSize: 12, lineHeight: 19, color: colors.textSecondary }}>
        {repeatDescription}
      </Text>
    </View>

    <Pressable accessibilityRole="button" accessibilityState={{ disabled: busy, busy }} disabled={busy}
      onPress={item.archived ? props.onRestore : props.onComplete}
      style={({ pressed }) => ({ marginTop: 18, minHeight: 52, paddingHorizontal: 20, paddingVertical: 12,
        flexDirection: 'row', gap: 9, alignItems: 'center', justifyContent: 'center', borderRadius: 14,
        backgroundColor: colors.primaryFill, opacity: busy ? 0.55 : pressed ? 0.85 : 1 })}>
      {activeAction === 'complete' || activeAction === 'restore' ? <ActivityIndicator color={colors.onPrimary} size="small" /> : <Check size={19} color={colors.onPrimary} />}
      <Text style={{ fontSize: 15, lineHeight: 23, fontWeight: '600', color: colors.onPrimary }}>{item.archived ? activeAction === 'restore' ? 'Restoring...' : 'Restore reminder' : activeAction === 'complete' ? 'Marking done...' : 'Mark done'}</Text>
    </Pressable>
    <Text style={{ marginTop: 8, fontSize: 12, lineHeight: 19, color: colors.textSecondary, textAlign: 'center' }}>
      {item.archived ? 'Returns this item to your active reminders.' : item.repeatType === 'none' ? 'Moves this item to your archive.' : 'Completes this occurrence and schedules the next one.'}
    </Text>

    {!item.archived ? <View style={{ flexDirection: fontScale > 1.3 ? 'column' : 'row', gap: 8, marginTop: 18 }}>
      <QuietAction label="Edit" icon={<Pencil size={16} color={colors.primary} />} disabled={busy} onPress={props.onEdit} />
      <QuietAction label="Date & time" icon={<Calendar size={16} color={colors.primary} />} disabled={busy} onPress={props.onReschedule} />
      <QuietAction label={activeAction === 'snooze' ? 'Snoozing...' : 'Snooze 1h'} icon={<Clock size={16} color={colors.primary} />}
        disabled={busy || deviceStatus?.state !== 'ready'} onPress={props.onSnooze} />
    </View> : null}

    {props.error ? <Text accessibilityRole="alert" selectable style={{ padding: 14, borderRadius: 12, marginTop: 16, fontSize: 13, lineHeight: 21, color: colors.danger, backgroundColor: colors.dangerSoft }}>{props.error}</Text> : null}
    {props.message ? <Text accessibilityLiveRegion="polite" style={{ padding: 14, borderRadius: 12, marginTop: 16, fontSize: 13, lineHeight: 21, color: colors.text, backgroundColor: colors.primarySoft }}>{props.message}</Text> : null}

    <SectionTitle>Reminders</SectionTitle>
    <View style={{ ...panel, paddingHorizontal: 18 }}>
      <View style={{ paddingTop: 17, paddingBottom: 12 }}>
        <Text style={{ fontSize: 12, lineHeight: 19, color: colors.textSecondary }}>{nextAlert ? deviceStatus?.timing === 'may-be-delayed' ? 'Next alert requested for' : 'Next alert' : 'Notification status'}</Text>
        <Text accessibilityLiveRegion="polite" style={{ marginTop: 5, fontSize: 14, lineHeight: 22, fontWeight: '500', color: colors.text }}>{scheduleMessage}</Text>
      </View>
      {nextAlert ? <Text style={{ marginBottom: 12, fontSize: 12, lineHeight: 19, color: colors.textSecondary }}>Local time on this phone.{deviceStatus?.timing === 'may-be-delayed' ? ' Android may deliver alerts later, especially while the phone is idle.' : ''}</Text> : null}
      {!item.archived && deviceStatus?.state === 'blocked' && deviceStatus.blockedReason !== 'channel-missing' ? <TextAction label="Open notification settings" onPress={props.onSettings} disabled={busy} /> : null}
      {!item.archived && deviceStatus?.state === 'blocked' && deviceStatus.blockedReason === 'channel-missing' && hasFutureConfigured ? <TextAction label={activeAction === 'refresh' ? 'Setting up...' : 'Set up reminder alerts'} onPress={props.onRefresh} disabled={busy} /> : null}
      {!item.archived && deviceStatus?.state === 'ready' && hasUnscheduled ? <View>
        <Text style={{ fontSize: 12, lineHeight: 19, color: colors.textSecondary }}>Retry to schedule the missing future alerts. Past alert times will be skipped.</Text>
        <TextAction label={activeAction === 'refresh' ? 'Scheduling...' : 'Retry future alerts'} onPress={props.onRefresh} disabled={busy} />
      </View> : null}
      {!item.archived && deviceStatus?.state === 'error' ? <View>
        <Text style={{ fontSize: 12, lineHeight: 19, color: colors.textSecondary }}>Your reminder is saved. Check the notification schedule again before making changes.</Text>
        <TextAction label="Check schedule again" onPress={props.onCheckSchedule} disabled={busy} />
      </View> : null}
      {!item.archived && deviceStatus?.state === 'unsupported' ? <Text style={{ paddingBottom: 12, fontSize: 12, lineHeight: 19, color: colors.textSecondary }}>Use an Android or iOS development or installed build to schedule and verify alerts.</Text> : null}
      {!item.archived && ((deviceStatus?.state === 'ready' && !nextAlert && !hasUnscheduled) || (deviceStatus?.blockedReason === 'channel-missing' && !hasFutureConfigured)) ? <View>
        <Text style={{ fontSize: 12, lineHeight: 19, color: colors.textSecondary }}>{hasEnabled ? 'The configured alert times have passed. Choose a future date or adjust your reminder days.' : 'Choose reminder days to receive alerts before or on the due date.'}</Text>
        <TextAction label="Edit date & alerts" onPress={props.onReschedule} disabled={busy} />
      </View> : null}
      {reminders.length > 0 ? <Pressable accessibilityRole="button" accessibilityState={{ expanded: showSchedule }}
        onPress={() => setShowSchedule(!showSchedule)} style={{ minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <Text style={{ fontSize: 13, lineHeight: 20, color: colors.primary }}>{showSchedule ? 'Hide' : 'View'} schedule ({reminders.length})</Text>
        {showSchedule ? <ChevronUp size={16} color={colors.primary} /> : <ChevronDown size={16} color={colors.primary} />}
      </Pressable> : <Text style={{ paddingBottom: 17, fontSize: 12, lineHeight: 19, color: colors.textSecondary }}>No reminder days configured.</Text>}
      {showSchedule ? schedule.slice().sort((a, b) => b.daysBefore - a.daysBefore).map((row) => {
        const status = row.status;
        return <View key={row.id} style={{ paddingVertical: 13, borderTopWidth: 1, borderTopColor: colors.border, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8 }}>
          <View style={{ flexShrink: 1 }}>
            <Text style={{ fontSize: 13, lineHeight: 20, color: colors.text }}>{row.isSnooze ? 'Extra snooze alert' : row.daysBefore === 0 ? 'On the due date' : `${row.daysBefore} ${row.daysBefore === 1 ? 'day' : 'days'} before`}</Text>
            {row.scheduledFor ? <Text style={{ marginTop: 3, fontSize: 12, lineHeight: 19, color: colors.textSecondary }}>{new Date(row.scheduledFor).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</Text> : null}
          </View>
          <Text style={{ fontSize: 12, lineHeight: 20, color: status === 'Scheduled' ? colors.success : colors.textSecondary }}>{status}</Text>
        </View>;
      }) : null}
    </View>

    {item.notes ? <View><SectionTitle>Notes</SectionTitle><Text selectable style={{ fontSize: 14, lineHeight: 24, color: colors.text }}>{item.notes}</Text></View> : null}

    <SectionTitle>Details</SectionTitle>
    <View style={{ borderTopWidth: 1, borderTopColor: colors.border }}>
      {[{ label: 'Date type', value: item.dateType }, { label: 'Priority', value: item.importance }, { label: 'Repeat', value: repeat }].map((row) => <View key={row.label}
        style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <Text style={{ fontSize: 13, lineHeight: 20, color: colors.textSecondary }}>{row.label}</Text>
        <Text style={{ fontSize: 13, lineHeight: 20, color: colors.text, textTransform: 'capitalize' }}>{row.value}</Text>
      </View>)}
    </View>

    {history.length > 0 ? <View style={{ marginTop: 22 }}>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: showHistory }} onPress={() => setShowHistory(!showHistory)}
        style={{ minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <Text style={{ fontSize: 17, lineHeight: 25, fontWeight: '600', color: colors.text }}>History ({history.length})</Text>
        {showHistory ? <ChevronUp size={17} color={colors.textSecondary} /> : <ChevronDown size={17} color={colors.textSecondary} />}
      </Pressable>
      {showHistory ? history.map((entry) => <View key={entry.id} style={{ paddingVertical: 14, borderTopWidth: 1, borderTopColor: colors.border }}>
        <Text style={{ fontSize: 13, lineHeight: 21, color: colors.text }}>From {entry.previousDate}</Text>
        <Text style={{ fontSize: 13, lineHeight: 21, color: colors.text }}>To {entry.newDate}</Text>
        <Text style={{ fontSize: 12, lineHeight: 20, marginTop: 5, color: colors.textSecondary }}>{entry.changedAt}</Text>
      </View>) : null}
    </View> : null}

    <SectionTitle>Manage reminder</SectionTitle>
    <View style={{ borderTopWidth: 1, borderTopColor: colors.border }}>
      {!item.archived ? <TextAction label={activeAction === 'archive' ? 'Archiving...' : 'Archive reminder'} icon={<Archive size={17} color={colors.textSecondary} />} onPress={props.onArchive} disabled={busy} muted /> : null}
      <TextAction label={activeAction === 'delete' ? 'Deleting...' : 'Delete permanently'} icon={<Trash size={17} color={colors.danger} />} onPress={props.onDelete} disabled={busy} danger />
    </View>
  </View>;
}

function SectionTitle({ children }: { children: ReactNode }) {
  const colors = useTheme();
  return <Text accessibilityRole="header" style={{ marginTop: 28, marginBottom: 12, fontSize: 17, lineHeight: 25, fontWeight: '600', letterSpacing: -0.3, color: colors.text }}>{children}</Text>;
}
function QuietAction({ label, icon, disabled, onPress }: { label: string; icon: ReactNode; disabled: boolean; onPress: () => void }) {
  const colors = useTheme();
  return <Pressable accessibilityRole="button" disabled={disabled} accessibilityState={{ disabled }} onPress={onPress}
    style={({ pressed }) => ({ flex: 1, minHeight: 66, paddingVertical: 11, paddingHorizontal: 5, gap: 6, alignItems: 'center', justifyContent: 'center',
      borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: pressed ? colors.surfaceInset : colors.surface, opacity: disabled ? 0.45 : 1 })}>
    {icon}<Text style={{ fontSize: 12, lineHeight: 18, color: colors.text }}>{label}</Text>
  </Pressable>;
}
function TextAction({ label, icon, disabled, onPress, danger, muted }: { label: string; icon?: ReactNode; disabled: boolean; onPress: () => void; danger?: boolean; muted?: boolean }) {
  const colors = useTheme();
  return <Pressable accessibilityRole="button" disabled={disabled} accessibilityState={{ disabled }} onPress={onPress}
    style={({ pressed }) => ({ minHeight: 48, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 10, opacity: disabled ? 0.45 : pressed ? 0.6 : 1 })}>
    {icon}<Text style={{ flex: 1, fontSize: 13, lineHeight: 21, color: danger ? colors.danger : muted ? colors.textSecondary : colors.primary }}>{label}</Text>
  </Pressable>;
}
