import '../global.css';

import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { isRunningInExpoGo } from 'expo';
import type { NotificationResponse } from 'expo-notifications';
import { DarkTheme, DefaultTheme, router, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Platform, StyleSheet, Text, View } from 'react-native';

import { COMPLETE_ACTION, reminderActionData } from '@/utils/notification-actions';

import migrations from '../../drizzle/migrations';
import { db } from '@/db';
import { seedDefaultCategories } from '@/db/seed';
import { runWithNotificationRuntime } from '@/utils/notification-runtime';
import { createNotificationResponseCoordinator } from '@/utils/notification-routing';
import { AppearanceProvider, useAppearance } from '@/contexts/appearance';
import { useTheme } from '@/hooks/use-theme';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

// Drizzle Kit 1.0 RC generates the runtime bundle without the legacy journal
// field, while the migrator hook's declaration still requires it.
const bundledMigrations = migrations as unknown as Parameters<typeof useMigrations>[1];

export default function RootLayout() {
  return <AppearanceProvider><RootLayoutContent /></AppearanceProvider>;
}

function RootLayoutContent() {
  const colors = useTheme();
  const { resolvedTheme } = useAppearance();
  const reducedMotion = useReducedMotion();
  const navigationTheme = useMemo(() => {
    const base = resolvedTheme === 'dark' ? DarkTheme : DefaultTheme;
    return { ...base, colors: { ...base.colors, background: colors.homeBackground,
      card: colors.surface, text: colors.text, border: colors.border,
      primary: colors.primary, notification: colors.danger } };
  }, [colors, resolvedTheme]);

  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(colors.homeBackground).catch(() => {
      // The app views still carry their own theme-aware backgrounds.
    });
  }, [colors.homeBackground]);

  const { success, error } = useMigrations(db, bundledMigrations);
  const [seedComplete, setSeedComplete] = useState(false);
  const [seedError, setSeedError] = useState<Error>();
  const runningInAndroidExpoGo = Platform.OS === 'android' && isRunningInExpoGo();
  const responseCoordinator = useRef(
    createNotificationResponseCoordinator((route) => {
      router.push(route);
      void runWithNotificationRuntime({
        platform: Platform.OS,
        runningInExpoGo: runningInAndroidExpoGo,
        load: () => import('expo-notifications'),
        onLoaded: ({ clearLastNotificationResponse }) => {
          clearLastNotificationResponse();
        },
      });
    }, async (input) => {
      const data = reminderActionData(input.data);
      if (!data) return;
      const service = await import('@/services/items');
      if (input.actionIdentifier === COMPLETE_ACTION) await service.completeItem(data.itemId, data.targetDate);
      else await service.snoozeItem(data.itemId, data.targetDate, input.requestIdentifier);
      const Notifications = await import('expo-notifications');
      await Notifications.dismissNotificationAsync(input.requestIdentifier);
      Notifications.clearLastNotificationResponse();
    }, (error) => {
      Alert.alert('Reminder action failed', error instanceof Error ? error.message : 'Please try again from the item.');
    }),
  );

  useEffect(() => {
    let active = true;
    let removeListener: (() => void) | undefined;

    void runWithNotificationRuntime({
      platform: Platform.OS,
      runningInExpoGo: runningInAndroidExpoGo,
      load: async () => {
        const [, Notifications] = await Promise.all([
          import('@/services/notifications').then(async (service) => { await service.registerReminderActions(); return service; }),
          import('expo-notifications'),
        ]);
        return Notifications;
      },
      onLoaded: (Notifications) => {
        if (!active) return;

        const handleResponse = (response: NotificationResponse) => {
          responseCoordinator.current.handleResponse({
            actionIdentifier: response.actionIdentifier,
            data: response.notification.request.content.data,
            defaultActionIdentifier: Notifications.DEFAULT_ACTION_IDENTIFIER,
            requestIdentifier: response.notification.request.identifier,
          });
        };

        const subscription = Notifications.addNotificationResponseReceivedListener(handleResponse);
        removeListener = () => subscription.remove();
        const initialResponse = Notifications.getLastNotificationResponse();
        if (initialResponse) handleResponse(initialResponse);
      },
    });

    return () => {
      active = false;
      removeListener?.();
    };
  }, [runningInAndroidExpoGo]);

  useEffect(() => {
    if (!success) {
      return;
    }

    let isActive = true;

    seedDefaultCategories()
      .then(() => {
        if (isActive) {
          setSeedComplete(true);
        }
      })
      .catch((caughtError: unknown) => {
        if (isActive) {
          setSeedError(
            caughtError instanceof Error
              ? caughtError
              : new Error('Unable to seed the database.'),
          );
        }
      });

    return () => {
      isActive = false;
    };
  }, [success]);

  useEffect(() => {
    responseCoordinator.current.setReady(Boolean(success && seedComplete));
  }, [seedComplete, success]);

  useEffect(() => {
    if (!success || !seedComplete || runningInAndroidExpoGo) return;

    void import('@/services/notification-cleanup')
      .then(({ processNotificationCleanup }) => processNotificationCleanup())
      .catch(() => {
        // Cleanup rows are durable and will retry after the next startup or mutation.
      });
  }, [runningInAndroidExpoGo, seedComplete, success]);

  const setupError = error ?? seedError;

  if (setupError) {
    return (
      <View style={[styles.container, { backgroundColor: colors.dangerSoft }]}>
        <StatusBar style={resolvedTheme === 'dark' ? 'light' : 'dark'} />
        <Text style={[styles.errorTitle, { color: colors.danger }]}>Database setup failed</Text>
        <Text selectable style={[styles.errorMessage, { color: colors.danger }]}>
          {setupError.message}
        </Text>
      </View>
    );
  }

  if (!success || !seedComplete) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar style={resolvedTheme === 'dark' ? 'light' : 'dark'} />
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Preparing Duewise...</Text>
      </View>
    );
  }

  return <ThemeProvider value={navigationTheme}>
    <StatusBar style={resolvedTheme === 'dark' ? 'light' : 'dark'} />
    <Stack screenOptions={{
      headerShown: false,
      animation: reducedMotion ? 'none' : Platform.OS === 'android' ? 'fade' : 'default',
      contentStyle: { backgroundColor: colors.homeBackground },
    }} />
  </ThemeProvider>;
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  errorMessage: {
    fontSize: 14,
    marginTop: 12,
    textAlign: 'center',
  },
  loadingText: {
    fontSize: 15,
    marginTop: 16,
  },
});
