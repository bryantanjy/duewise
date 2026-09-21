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
import * as Haptics from 'expo-haptics';

import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
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
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
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
      <View className="flex-row items-center px-5 py-3">
        <Pressable
          accessibilityLabel="Go back"
          accessibilityRole="button"
          className="h-10 flex-row items-center pr-3 active:opacity-70"
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
            router.back();
          }}>
          <ChevronLeft color={colors.primary} size={22} strokeWidth={2.2} />
          <Text className="text-sm font-bold text-app-primary">Back</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerClassName="px-5 pb-16 pt-2" showsVerticalScrollIndicator={false}>
        <Text className="text-[11px] font-bold uppercase tracking-[1.5px] text-app-primary">Duewise</Text>
        <Text className="mt-0.5 text-3xl font-extrabold tracking-tight text-app-text">Settings</Text>

        {/* Appearance Card */}
        <Text className="mb-2.5 mt-8 text-xs font-bold uppercase tracking-[1.5px] text-app-muted">
          Appearance
        </Text>
        <Card className="p-5">
          <Text className="text-base font-bold text-app-text">Theme preference</Text>
          <Text className="mt-1 text-xs leading-5 text-app-muted">
            System mirrors device settings. Select Light or Dark to override anytime.
          </Text>
          <View accessibilityRole="radiogroup" className="mt-4 flex-row gap-2.5">
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
                  className="min-h-[76px] flex-1 items-center justify-center rounded-2xl border active:opacity-80"
                  key={value}
                  onPress={() => {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                    setPreference(value);
                  }}
                  style={{
                    backgroundColor: selected ? colors.primarySoft : colors.surfaceInset,
                    borderColor: selected ? colors.primary : 'transparent',
                    borderWidth: 1.5,
                  }}>
                  <Icon color={selected ? colors.primary : colors.textSecondary} size={20} />
                  <Text
                    className="mt-2 text-xs font-bold"
                    style={{ color: selected ? colors.primary : colors.textSecondary }}>
                    {label}
                  </Text>
                  {selected ? (
                    <View className="absolute right-2 top-2">
                      <Check color={colors.primary} size={14} strokeWidth={2.5} />
                    </View>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        </Card>

        {/* Reminders Testing Card */}
        <Text className="mb-2.5 mt-7 text-xs font-bold uppercase tracking-[1.5px] text-app-muted">
          Notifications
        </Text>
        <Card className="p-5">
          <View className="flex-row items-start">
            <View
              className="h-10 w-10 items-center justify-center rounded-2xl"
              style={{ backgroundColor: colors.primarySoft }}>
              <BellRing color={colors.primary} size={20} />
            </View>
            <View className="ml-3.5 flex-1">
              <Text className="text-base font-bold text-app-text">Local alerts</Text>
              <Text className="mt-0.5 text-xs leading-5 text-app-muted">
                Reminders are generated on this device and delivered at 9:00 AM on scheduled days.
              </Text>
            </View>
          </View>
          <View className="mt-5">
            <Button
              fullWidth
              loading={isTesting}
              onPress={testNotification}
              title={isTesting ? 'Scheduling...' : 'Send 10-second test'}
            />
          </View>
          {message ? (
            <Text className="mt-3 text-xs leading-5 text-app-muted">{message}</Text>
          ) : null}
        </Card>

        {/* Privacy & Storage Card */}
        <Text className="mb-2.5 mt-7 text-xs font-bold uppercase tracking-[1.5px] text-app-muted">
          Privacy & Storage
        </Text>
        <Card className="overflow-hidden p-0">
          <View className="min-h-16 flex-row items-center px-5 py-3">
            <Database color={colors.primary} size={18} />
            <View className="ml-4 flex-1">
              <Text className="text-sm font-bold text-app-text">Local SQLite Database</Text>
              <Text className="text-xs text-app-muted">All data is preserved locally on device.</Text>
            </View>
          </View>

          <Pressable
            accessibilityRole="button"
            className="min-h-16 flex-row items-center border-t border-app-border px-5 py-3 active:opacity-75"
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
              router.push('/archived');
            }}
            style={({ pressed }) => [{ backgroundColor: pressed ? colors.primarySoft : 'transparent' }]}>
            <Archive color={colors.primary} size={18} />
            <View className="ml-4 flex-1">
              <Text className="text-sm font-bold text-app-text">Archived Items</Text>
              <Text className="text-xs text-app-muted">
                Review, restore, or purge inactive reminders.
              </Text>
            </View>
          </Pressable>

          <View className="min-h-16 flex-row items-center border-t border-app-border px-5 py-3">
            <ShieldCheck color={colors.success} size={18} />
            <View className="ml-4 flex-1">
              <Text className="text-sm font-bold text-app-text">Private & Account-Free</Text>
              <Text className="text-xs text-app-muted">Duewise never transmits your item data.</Text>
            </View>
          </View>
        </Card>

        <Text className="mt-8 text-center text-xs font-medium text-app-muted">
          Duewise · Version 1.0.0
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

