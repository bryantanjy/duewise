import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { REMINDER_CATEGORY, SNOOZE_ACTION, COMPLETE_ACTION } from '../utils/notification-actions';
import { reminderDateFor } from '../utils/reminder-time';

const REMINDERS_CHANNEL_ID = 'duewise-reminders';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function createAndroidReminderChannel() {
  if (Platform.OS !== 'android') {
    return;
  }

  await Notifications.setNotificationChannelAsync(REMINDERS_CHANNEL_ID, {
    name: 'Duewise reminders',
    description: 'Reminders for upcoming and overdue items.',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#635BFF',
  });
}

export async function requestNotificationPermission() {
  if (Platform.OS === 'web') {
    return false;
  }

  await createAndroidReminderChannel();
  await registerReminderActions();

  const currentPermission = await Notifications.getPermissionsAsync();

  if (currentPermission.granted) {
    return true;
  }

  const requestedPermission = await Notifications.requestPermissionsAsync();
  return requestedPermission.granted;
}

export async function scheduleTestNotification(
  delayInSeconds = 10,
  data: Record<string, string | number> = { type: 'notification-test' },
) {
  const hasPermission = await requestNotificationPermission();
  if (!hasPermission) return null;

  return Notifications.scheduleNotificationAsync({
    content: {
      title: 'Duewise reminder test',
      body: 'Local notifications are working on this device.',
      data,
      sound: 'default',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: delayInSeconds,
      channelId: Platform.OS === 'android' ? REMINDERS_CHANNEL_ID : undefined,
    },
  });
}

export type ItemReminderInput = {
  daysBefore: number;
  itemId: number;
  itemName: string;
  targetDate: string;
  reminderTime?: string;
};

export async function scheduleItemReminder({
  daysBefore,
  itemId,
  itemName,
  targetDate,
  reminderTime = '09:00',
}: ItemReminderInput) {
  const reminderDate = reminderDateFor(targetDate, daysBefore, reminderTime);

  if (reminderDate.getTime() <= Date.now()) {
    return null;
  }

  const hasPermission = await requestNotificationPermission();

  if (!hasPermission) {
    return null;
  }

  const timing =
    daysBefore === 0
      ? 'is due today'
      : `is due in ${daysBefore} ${daysBefore === 1 ? 'day' : 'days'}`;

  return Notifications.scheduleNotificationAsync({
    content: {
      categoryIdentifier: REMINDER_CATEGORY,
      title: `${itemName} ${timing}`,
      body: `Due date: ${targetDate}`,
      data: {
        itemId,
        type: 'item-reminder',
        targetDate,
        scheduledFor: reminderDate.toISOString(),
        url: `/item/${itemId}`,
      },
      sound: 'default',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: reminderDate,
      channelId: Platform.OS === 'android' ? REMINDERS_CHANNEL_ID : undefined,
    },
  });
}

export type NotificationAdapter = {
  cancel(notificationId: string): Promise<void>;
  schedule(input: ItemReminderInput): Promise<string | null>;
};

export const deviceNotificationAdapter: NotificationAdapter = {
  cancel: Notifications.cancelScheduledNotificationAsync,
  schedule: scheduleItemReminder,
};


export async function registerReminderActions() {
  if (Platform.OS === 'web') return;
  await Notifications.setNotificationCategoryAsync(REMINDER_CATEGORY, [
    { identifier: SNOOZE_ACTION, buttonTitle: 'Snooze 1 hour', options: { opensAppToForeground: true } },
    { identifier: COMPLETE_ACTION, buttonTitle: 'Mark done', options: { opensAppToForeground: true } },
  ]);
}

export async function scheduleSnoozedReminder(input: { itemId: number; itemName: string; targetDate: string; requestId: string }) {
  if (!await requestNotificationPermission()) throw new Error('Enable notifications in Settings before snoozing.');
  const scheduledFor = new Date(Date.now() + 3600000);
  return Notifications.scheduleNotificationAsync({
    identifier: `duewise_snooze_${input.requestId}`,
    content: {
      title: input.itemName,
      body: 'Your snoozed reminder', sound: 'default', categoryIdentifier: REMINDER_CATEGORY,
      data: { type: 'item-reminder', itemId: input.itemId, targetDate: input.targetDate, scheduledFor: scheduledFor.toISOString() },
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: scheduledFor,
      channelId: Platform.OS === 'android' ? REMINDERS_CHANNEL_ID : undefined },
  });
}
