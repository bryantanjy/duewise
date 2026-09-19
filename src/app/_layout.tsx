import '../global.css';

import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { isRunningInExpoGo } from 'expo';
import type { NotificationResponse } from 'expo-notifications';
import { router, Stack } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';

import migrations from '../../drizzle/migrations';
import { db } from '@/db';
import { seedDefaultCategories } from '@/db/seed';
import { runWithNotificationRuntime } from '@/utils/notification-runtime';
import { createNotificationResponseCoordinator } from '@/utils/notification-routing';

// Drizzle Kit 1.0 RC generates the runtime bundle without the legacy journal
// field, while the migrator hook's declaration still requires it.
const bundledMigrations = migrations as unknown as Parameters<typeof useMigrations>[1];

export default function RootLayout() {
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
          import('@/services/notifications'),
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
      <View style={[styles.container, styles.errorBackground]}>
        <Text style={styles.errorTitle}>Database setup failed</Text>
        <Text selectable style={styles.errorMessage}>
          {setupError.message}
        </Text>
      </View>
    );
  }

  if (!success || !seedComplete) {
    return (
      <View style={styles.container}>
        <ActivityIndicator color="#635BFF" size="large" />
        <Text style={styles.loadingText}>Preparing Duewise...</Text>
      </View>
    );
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: '#F7F7F5',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  errorBackground: {
    backgroundColor: '#FFF7F7',
  },
  errorTitle: {
    color: '#D84A4A',
    fontSize: 20,
    fontWeight: '700',
  },
  errorMessage: {
    color: '#8F3030',
    fontSize: 14,
    marginTop: 12,
    textAlign: 'center',
  },
  loadingText: {
    color: '#737373',
    fontSize: 15,
    marginTop: 16,
  },
});
