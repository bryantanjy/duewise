import { isRunningInExpoGo } from 'expo';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { notificationRuntimeSupported } from '@/utils/notification-runtime';
import type { ReminderDeviceStatus } from '@/utils/reminder-status';

export function useReminderStatus(version: string, checkVersion = 0) {
  const [status, setStatus] = useState<ReminderDeviceStatus>();
  useFocusEffect(useCallback(() => {
    setStatus(undefined);
    const trackedIds = new Set(version.split(','));
    let active = true;
    let generation = checkVersion;
    async function refresh() {
      const current = ++generation;
      try {
        if (!notificationRuntimeSupported(Platform.OS, Platform.OS === 'android' && isRunningInExpoGo())) {
          if (active) setStatus({ state: 'unsupported', notifications: [] });
          return;
        }
        const { getReminderDeviceStatus } = await import('@/services/notifications');
        const nextStatus = await getReminderDeviceStatus(trackedIds);
        if (!active || current !== generation) return;
        setStatus(nextStatus);
      } catch {
        if (active && current === generation) setStatus({ state: 'error', notifications: [] });
      }
    }
    void refresh();
    const listener = AppState.addEventListener('change', (state) => { if (state === 'active') void refresh(); });
    const timer = setInterval(() => { void refresh(); }, 30000);
    return () => { active = false; listener.remove(); clearInterval(timer); };
  }, [version, checkVersion]));
  return status;
}
