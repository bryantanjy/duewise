import { isRunningInExpoGo } from 'expo';
import { router } from 'expo-router';
import Archive from 'lucide-react-native/icons/archive';
import BellRing from 'lucide-react-native/icons/bell-ring';
import ChevronLeft from 'lucide-react-native/icons/chevron-left';
import Database from 'lucide-react-native/icons/database';
import ShieldCheck from 'lucide-react-native/icons/shield-check';
import { useState } from 'react';
import { Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { notificationRuntimeSupported } from '@/utils/notification-runtime';

export default function SettingsScreen() {
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
    <SafeAreaView className="flex-1 bg-app-bg" edges={['top', 'bottom']}>
      <View className="flex-row items-center px-4 py-2">
        <Pressable className="h-11 flex-row items-center pr-4" onPress={() => router.back()}>
          <ChevronLeft color="#635BFF" size={22} />
          <Text className="font-semibold text-app-primary">Back</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerClassName="px-5 pb-12 pt-2">
        <Text className="text-xs font-bold uppercase tracking-[2px] text-app-primary">Duewise</Text>
        <Text className="mt-1 text-3xl font-bold tracking-tight text-app-text">Settings</Text>

        <Text className="mb-3 mt-8 text-xs font-bold uppercase tracking-[1.5px] text-app-muted">
          Reminders
        </Text>
        <View className="rounded-2xl bg-app-surface p-5">
          <View className="flex-row items-start">
            <View className="h-11 w-11 items-center justify-center rounded-xl bg-app-primary-soft">
              <BellRing color="#635BFF" size={21} />
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
        <View className="overflow-hidden rounded-2xl bg-app-surface">
          <View className="min-h-20 flex-row items-center px-5">
            <Database color="#635BFF" size={20} />
            <View className="ml-4 flex-1">
              <Text className="font-semibold text-app-text">Stored locally</Text>
              <Text className="mt-1 text-sm text-app-muted">Your items remain in the device database.</Text>
            </View>
          </View>
          <Pressable
            accessibilityRole="button"
            className="min-h-20 flex-row items-center border-t border-app-border px-5 active:bg-app-primary-soft"
            onPress={() => router.push('/archived')}>
            <Archive color="#635BFF" size={20} />
            <View className="ml-4 flex-1">
              <Text className="font-semibold text-app-text">Archived items</Text>
              <Text className="mt-1 text-sm text-app-muted">
                Restore or permanently remove archived dates.
              </Text>
            </View>
          </Pressable>
          <View className="min-h-20 flex-row items-center border-t border-app-border px-5">
            <ShieldCheck color="#4F8A63" size={20} />
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
