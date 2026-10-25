import { isRunningInExpoGo } from 'expo';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import Archive from 'lucide-react-native/icons/archive';
import BellRing from 'lucide-react-native/icons/bell-ring';
import ChevronLeft from 'lucide-react-native/icons/chevron-left';
import Database from 'lucide-react-native/icons/database';
import ShieldCheck from 'lucide-react-native/icons/shield-check';
import Check from 'lucide-react-native/icons/check';
import Monitor from 'lucide-react-native/icons/monitor';
import Moon from 'lucide-react-native/icons/moon';
import Sun from 'lucide-react-native/icons/sun';
import Download from 'lucide-react-native/icons/download';
import Upload from 'lucide-react-native/icons/upload';
import { type ReactNode, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import ChevronRight from 'lucide-react-native/icons/chevron-right';
import Button from '@/components/ui/Button';
import { notificationRuntimeSupported } from '@/utils/notification-runtime';
import { useAppearance } from '@/contexts/appearance';
import { useReminderStatus } from '@/hooks/use-reminder-status';
import { openNotificationSettings } from '@/services/notification-settings';
import { useTheme } from '@/hooks/use-theme';
import type { backupPreview, Backup } from '@/utils/backup';

export default function SettingsScreen() {
  const colors = useTheme();
  const deviceStatus = useReminderStatus('');
  const { preference, setPreference } = useAppearance();
  const [isTesting, setIsTesting] = useState(false);
  const [message, setMessage] = useState<string>();
  const [backupAction, setBackupAction] = useState<'export' | 'choose' | 'restore'>();
  const backupBusy = useRef(false);
  const [backupMessage, setBackupMessage] = useState<string>();
  const [backupError, setBackupError] = useState<string>();
  const [pendingBackup, setPendingBackup] = useState<{
    name: string; backup: Backup; preview: ReturnType<typeof backupPreview>;
  }>();
  const runningInAndroidExpoGo = Platform.OS === 'android' && isRunningInExpoGo();
  const notificationRuntimeAvailable = notificationRuntimeSupported(
    Platform.OS,
    runningInAndroidExpoGo,
  );

  async function testNotification() {
    if (!notificationRuntimeAvailable) {
      setMessage(
        runningInAndroidExpoGo
          ? 'Open Duewise in its development build to test notifications.'
          : 'Notification testing is available on Android and iOS.',
      );
      return;
    }

    setIsTesting(true);
    setMessage(undefined);
    try {
      const { scheduleTestNotification } = await import('@/services/notifications');
      const notificationId = await scheduleTestNotification();
      setMessage(
        notificationId
          ? 'Test requested. Put Duewise in the background and wait about 10 seconds.'
          : 'Notifications or the Duewise reminders channel are disabled. Open notification settings to enable them.',
      );
    } catch (caughtError) {
      setMessage(caughtError instanceof Error ? caughtError.message : 'Unable to test notifications.');
    } finally {
      setIsTesting(false);
    }
  }

  async function handleBackup(action: 'export' | 'choose' | 'restore') {
    if (backupBusy.current) return;
    backupBusy.current = true;
    setBackupAction(action);
    setBackupMessage(undefined);
    setBackupError(undefined);
    try {
      if (action === 'export') {
        const { createBackup } = await import('@/services/backup');
        const { exportBackupFile } = await import('@/services/backup-files');
        const name = await exportBackupFile(createBackup());
        if (name) setBackupMessage(`Saved ${name} in your chosen folder. Keep a copy somewhere you can access on your next phone.`);
      } else if (action === 'choose') {
        setPendingBackup(undefined);
        const { chooseBackupFile } = await import('@/services/backup-files');
        const file = await chooseBackupFile();
        const { previewBackup } = await import('@/services/backup');
        if (file) setPendingBackup({ ...file, preview: previewBackup(file.backup) });
      } else if (pendingBackup) {
        const { restoreBackup } = await import('@/services/backup');
        const result = await restoreBackup(pendingBackup.backup);
        setPendingBackup(undefined);
        setBackupMessage(`${result.imported} items restored; ${result.duplicates} matching items skipped. ${result.scheduled} alerts scheduled.${result.unscheduled ? ` ${result.unscheduled} alerts could not be scheduled. Check notification permission and reminder dates, then edit and save affected items.` : ''}`);
      }
    } catch (error) {
      setBackupError(error instanceof Error ? error.message : 'Unable to complete backup operation.');
    } finally {
      backupBusy.current = false;
      setBackupAction(undefined);
    }
  }

  const panel = { borderRadius: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, overflow: 'hidden' as const };
  const secondary = { color: colors.textSecondary, fontSize: 13, lineHeight: 21 };
  const heading = { color: colors.text, fontSize: 15, lineHeight: 23, fontWeight: '600' as const };
  const flatButton = { shadowOpacity: 0, elevation: 0 };
  const filesUnavailable = Platform.OS === 'web';
  return <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: colors.homeBackground }}>
    <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8, flexDirection: 'row', alignItems: 'center' }}>
      <Pressable accessibilityLabel="Go back" accessibilityRole="button" onPress={() => router.back()}
        style={({ pressed }) => ({ minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.5 : 1 })}>
        <ChevronLeft color={colors.text} size={24} strokeWidth={1.8} />
      </Pressable>
      <Text accessibilityRole="header" style={{ marginLeft: 8, fontSize: 22, lineHeight: 30, fontWeight: '600', letterSpacing: -0.6, color: colors.text }}>Settings</Text>
    </View>
    <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 36 }} showsVerticalScrollIndicator={false}>
      <SectionLabel title="Appearance" />
      <View style={{ ...panel, padding: 18 }}>
        <Text style={heading}>Make it feel like you</Text>
        <Text style={{ ...secondary, marginTop: 4 }}>Follow your device, or choose a theme.</Text>
        <View accessibilityRole="radiogroup" accessibilityLabel="Appearance" style={{ marginTop: 18, flexDirection: 'row', gap: 8 }}>
          {([
            { label: 'System', value: 'system', Icon: Monitor },
            { label: 'Light', value: 'light', Icon: Sun },
            { label: 'Dark', value: 'dark', Icon: Moon },
          ] as const).map(({ label, value, Icon }) => {
            const selected = preference === value;
            return <Pressable key={value} accessibilityRole="radio" accessibilityLabel={`${label} appearance`} accessibilityState={{ checked: selected }}
              onPress={() => setPreference(value)} style={({ pressed }) => ({ flex: 1, minHeight: 86, paddingVertical: 14, paddingHorizontal: 4, borderRadius: 14,
                borderWidth: 1, borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? colors.primarySoft : colors.surface,
                alignItems: 'center', justifyContent: 'center', gap: 9, opacity: pressed ? 0.65 : 1 })}>
              <Icon color={selected ? colors.primary : colors.textSecondary} size={21} strokeWidth={1.6} />
              <Text style={{ fontSize: 12, lineHeight: 19, color: selected ? colors.primary : colors.textSecondary, fontWeight: selected ? '600' : '400' }}>{label}</Text>
              {selected ? <View style={{ position: 'absolute', right: 6, top: 6 }}><Check color={colors.primary} size={12} /></View> : null}
            </Pressable>;
          })}
        </View>
      </View>

      <SectionLabel title="Notifications" />
      <View style={panel}>
        <SettingsRow icon={<BellRing color={colors.textSecondary} size={20} strokeWidth={1.6} />} title="Check your reminders"
          description="Alerts use the time you choose for each reminder." />
        <View style={{ paddingHorizontal: 18, paddingBottom: 18 }}>
          <Button title={isTesting ? 'Scheduling...' : 'Send 10-second test'} variant="outline" fullWidth loading={isTesting} onPress={() => { void testNotification(); }} style={flatButton} textStyle={{ fontWeight: '500', fontSize: 13 }} />
          <Text style={{ ...secondary, fontSize: 12, lineHeight: 19, marginTop: 10 }}>
            {runningInAndroidExpoGo ? 'Use a development build to test alerts on this phone.' : notificationRuntimeAvailable ? 'Send a test, then put Duewise in the background.' : 'Notification testing is available in the Android and iOS app.'}
          </Text>
          {Platform.OS === 'android' && notificationRuntimeAvailable ? <Text style={{ ...secondary, fontSize: 12, lineHeight: 19, marginTop: 8 }}>Android may deliver alerts later than the selected time, especially while the phone is idle.</Text> : null}
          {deviceStatus?.state === 'blocked' && deviceStatus.blockedReason !== 'channel-missing' ? <View style={{ marginTop: 12 }}>
            <Text accessibilityLiveRegion="polite" style={secondary}>{deviceStatus.blockedReason === 'channel' ? 'The Duewise reminders channel is turned off.' : 'Notifications are turned off for Duewise.'}</Text>
            <Button title="Open notification settings" variant="ghost" onPress={() => { void openNotificationSettings().catch(() => setMessage('Open your phone settings, then Duewise notifications.')); }} />
          </View> : null}
          {message ? <Text accessibilityLiveRegion="polite" style={{ ...secondary, marginTop: 10 }}>{message}</Text> : null}
        </View>
      </View>

      <SectionLabel title="Backup & restore" />
      <View style={panel}>
        <SettingsRow icon={<Download color={colors.textSecondary} size={20} strokeWidth={1.6} />} title="Save backup to folder" description="Use this copy to restore on your next phone."
          disabled={Boolean(backupAction) || filesUnavailable} loading={backupAction === 'export'} onPress={() => { void handleBackup('export'); }} />
        <SettingsRow divider icon={<Upload color={colors.textSecondary} size={20} strokeWidth={1.6} />} title="Choose backup to restore" description="Review the contents before adding them."
          disabled={Boolean(backupAction) || filesUnavailable} loading={backupAction === 'choose'} onPress={() => { void handleBackup('choose'); }} />
      </View>
      <Text style={{ ...secondary, fontSize: 12, lineHeight: 20, marginTop: 12, paddingHorizontal: 4 }}>Includes reminders, categories, notes, repeat rules, and history. Temporary snoozes stay on this phone.</Text>
      <Text style={{ ...secondary, fontSize: 12, lineHeight: 20, marginTop: 6, paddingHorizontal: 4 }}>Backup files are not encrypted. Save them somewhere private. On Android, automatic cloud backup and phone transfer are disabled; save a manual backup before changing phones or uninstalling.</Text>
      {filesUnavailable ? <Text style={{ ...secondary, marginTop: 8 }}>File backup and restore are available in the Android and iOS app.</Text> : null}
      {pendingBackup ? <View style={{ ...panel, padding: 18, marginTop: 16 }}>
        <Text accessibilityRole="header" style={heading}>Review backup</Text>
        <Text numberOfLines={2} style={{ ...secondary, marginTop: 8 }}>{pendingBackup.name}</Text>
        <Text style={{ ...secondary, fontSize: 12, marginTop: 4 }}>Created {new Date(pendingBackup.backup.exportedAt).toLocaleString()}</Text>
        <Text style={{ color: colors.text, fontSize: 14, lineHeight: 22, marginTop: 14 }}>{pendingBackup.preview.active} active and {pendingBackup.preview.archived} archived items to add. {pendingBackup.preview.duplicates} matching items will be skipped.</Text>
        {pendingBackup.preview.additions.slice(0, 5).map((item, index) => <Text key={index} numberOfLines={1} style={{ ...secondary, marginTop: 4 }}>{item.name}</Text>)}
        <Text style={{ ...secondary, marginTop: 12 }}>Your existing reminders will be kept. Future alerts will be scheduled on this phone; past alerts will be skipped.</Text>
        <View style={{ gap: 8, marginTop: 16 }}>
          <Button title="Restore items" fullWidth loading={backupAction === 'restore'} disabled={Boolean(backupAction) || pendingBackup.preview.additions.length === 0} onPress={() => { void handleBackup('restore'); }} style={flatButton} />
          <Button title="Cancel" fullWidth variant="ghost" disabled={Boolean(backupAction)} onPress={() => setPendingBackup(undefined)} />
        </View>
      </View> : null}
      {backupMessage ? <Text accessibilityLiveRegion="polite" style={{ ...secondary, marginTop: 12 }}>{backupMessage}</Text> : null}
      {backupError ? <Text accessibilityRole="alert" style={{ ...secondary, color: colors.danger, marginTop: 12 }}>{backupError}</Text> : null}

      <SectionLabel title="Your data" />
      <View style={panel}>
        <SettingsRow icon={<Archive color={colors.textSecondary} size={20} strokeWidth={1.6} />} title="Archived reminders" description="Review, restore, or permanently delete." onPress={() => router.push('/archived')} />
        <SettingsRow divider icon={<Database color={colors.textSecondary} size={20} strokeWidth={1.6} />} title="Stored on this phone" description="Your reminders are saved locally on your device." />
        <SettingsRow divider icon={<ShieldCheck color={colors.textSecondary} size={20} strokeWidth={1.6} />} title="Private by design" description="No account needed. Duewise does not send your reminders to its own servers." />
      </View>
      <Text style={{ ...secondary, fontSize: 12, textAlign: 'center', marginTop: 28 }}>Duewise / Version {Constants.expoConfig?.version ?? '1.1.0'}</Text>
    </ScrollView>
  </SafeAreaView>;
}

function SectionLabel({ title }: { title: string }) {
  const colors = useTheme();
  return <Text accessibilityRole="header" style={{ marginTop: 24, marginBottom: 12, marginLeft: 4, color: colors.textSecondary, fontSize: 12, lineHeight: 20, fontWeight: '500' }}>{title}</Text>;
}

function SettingsRow({ title, description, icon, onPress, divider, disabled, loading }: {
  title: string; description: string; icon: ReactNode; onPress?: () => void;
  divider?: boolean; disabled?: boolean; loading?: boolean;
}) {
  const colors = useTheme();
  const content = <>
    <View style={{ paddingTop: 2 }}>{icon}</View>
    <View style={{ flex: 1, minWidth: 0 }}>
      <Text style={{ color: colors.text, fontSize: 14, lineHeight: 22, fontWeight: '500' }}>{title}</Text>
      <Text style={{ color: colors.textSecondary, fontSize: 12, lineHeight: 19, marginTop: 3 }}>{description}</Text>
    </View>
    {loading ? <ActivityIndicator color={colors.primary} size="small" /> : onPress ? <ChevronRight color={colors.textSecondary} size={17} /> : null}
  </>;
  const style = { minHeight: 84, paddingHorizontal: 18, paddingVertical: 18, flexDirection: 'row' as const, alignItems: 'center' as const, gap: 14,
    borderTopWidth: divider ? 1 : 0, borderTopColor: colors.border, opacity: disabled ? 0.45 : 1 };
  return onPress ? <Pressable accessibilityRole="button" accessibilityLabel={`${title}. ${description}`} accessibilityState={{ disabled: Boolean(disabled), busy: Boolean(loading) }}
    disabled={disabled || loading} onPress={onPress} style={({ pressed }) => ({ ...style, backgroundColor: pressed ? colors.surfaceInset : colors.surface })}>{content}</Pressable>
    : <View style={style}>{content}</View>;
}
