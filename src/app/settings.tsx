import { isRunningInExpoGo } from 'expo';
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
import { useState } from 'react';
import { Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { notificationRuntimeSupported } from '@/utils/notification-runtime';
import { useAppearance } from '@/contexts/appearance';
import { useTheme } from '@/hooks/use-theme';

export default function SettingsScreen() {
  const colors = useTheme();
  const { preference, setPreference } = useAppearance();
  const [isTesting, setIsTesting] = useState(false);
  const [message, setMessage] = useState<string>();
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
          ? 'Test scheduled. Put Duewise in the background and wait about 10 seconds.'
          : 'Notification permission is disabled in device settings.',
      );
    } catch (caughtError) {
      setMessage(caughtError instanceof Error ? caughtError.message : 'Unable to test notifications.');
    } finally {
      setIsTesting(false);
    }
  }

  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: colors.background }}>
      <View className="flex-row items-center px-4 py-2">
        <Pressable className="h-11 flex-row items-center pr-4" onPress={() => router.back()}>
          <ChevronLeft color={colors.primary} size={22} />
          <Text className="font-semibold text-app-primary">Back</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerClassName="px-5 pb-12 pt-2">
        <Text className="text-xs font-bold uppercase tracking-[2px] text-app-primary">Duewise</Text>
        <Text className="mt-1 text-3xl font-bold tracking-tight text-app-text">Settings</Text>

        <Text className="mb-3 mt-8 text-xs font-bold uppercase tracking-[1.5px] text-app-muted">
          Appearance
        </Text>
        <View className="rounded-3xl border border-app-border bg-app-surface p-5">
          <Text className="text-base font-semibold text-app-text">Make it yours</Text>
          <Text className="mt-1 text-sm leading-5 text-app-muted">
            System follows your device. Choose a fixed look whenever you prefer.
          </Text>
          <View accessibilityRole="radiogroup" className="mt-5 flex-row gap-2">
            {([
              { label: 'System', value: 'system', Icon: Monitor },
              { label: 'Light', value: 'light', Icon: Sun },
              { label: 'Dark', value: 'dark', Icon: Moon },
            ] as const).map(({ label, value, Icon }) => {
              const selected = preference === value;
              return (
                <Pressable
                  accessibilityLabel={`${label} appearance`}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  className={`min-h-20 flex-1 items-center justify-center rounded-2xl border ${selected ? 'border-app-primary bg-app-primary-soft' : 'border-app-border bg-app-bg'}`}
                  key={value}
                  onPress={() => setPreference(value)}>
                  <Icon color={selected ? colors.primary : colors.textSecondary} size={20} />
                  <Text className={`mt-2 text-xs font-semibold ${selected ? 'text-app-primary' : 'text-app-muted'}`}>{label}</Text>
                  {selected ? <View className="absolute right-2 top-2"><Check color={colors.primary} size={13} /></View> : null}
                </Pressable>
              );
            })}
          </View>
        </View>

        <Text className="mb-3 mt-8 text-xs font-bold uppercase tracking-[1.5px] text-app-muted">
          Reminders
        </Text>
        <View className="rounded-3xl border border-app-border bg-app-surface p-5">
          <View className="flex-row items-start">
            <View className="h-11 w-11 items-center justify-center rounded-xl bg-app-primary-soft">
              <BellRing color={colors.primary} size={21} />
            </View>
            <View className="ml-4 flex-1">
              <Text className="text-base font-semibold text-app-text">Local notifications</Text>
              <Text className="mt-1 text-sm leading-5 text-app-muted">
                Reminders stay on this device and are scheduled for 9:00 AM.
              </Text>
            </View>
          </View>
          <Pressable
            className="mt-5 min-h-12 items-center justify-center rounded-xl bg-app-text active:opacity-80 disabled:opacity-50"
            disabled={isTesting}
            onPress={testNotification}>
            <Text className="font-semibold text-white">
              {isTesting ? 'Scheduling...' : 'Send 10-second test'}
            </Text>
          </Pressable>
          {message ? <Text className="mt-3 text-sm leading-5 text-app-muted">{message}</Text> : null}
        </View>

        <Text className="mb-3 mt-8 text-xs font-bold uppercase tracking-[1.5px] text-app-muted">
          Privacy & storage
        </Text>
        <View className="overflow-hidden rounded-3xl border border-app-border bg-app-surface">
          <View className="min-h-20 flex-row items-center px-5">
            <Database color={colors.primary} size={20} />
            <View className="ml-4 flex-1">
              <Text className="font-semibold text-app-text">Stored locally</Text>
              <Text className="mt-1 text-sm text-app-muted">Your items remain in the device database.</Text>
            </View>
          </View>
          <Pressable
            accessibilityRole="button"
            className="min-h-20 flex-row items-center border-t border-app-border px-5 active:bg-app-primary-soft"
            onPress={() => router.push('/archived')}>
            <Archive color={colors.primary} size={20} />
            <View className="ml-4 flex-1">
              <Text className="font-semibold text-app-text">Archived items</Text>
              <Text className="mt-1 text-sm text-app-muted">
                Restore or permanently remove archived dates.
              </Text>
            </View>
          </Pressable>
          <View className="min-h-20 flex-row items-center border-t border-app-border px-5">
            <ShieldCheck color={colors.success} size={20} />
            <View className="ml-4 flex-1">
              <Text className="font-semibold text-app-text">No account required</Text>
              <Text className="mt-1 text-sm text-app-muted">Duewise does not upload your item data.</Text>
            </View>
          </View>
        </View>

        <Text className="mt-8 text-center text-xs text-app-muted">Duewise · Version 1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}
