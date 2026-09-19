import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const REMINDERS_CHANNEL_ID = 'duewise-reminders';
const REMINDER_HOUR = 9;

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
};

function reminderDateFor(targetDate: string, daysBefore: number) {
  const [year, month, day] = targetDate.split('-').map(Number);
  const reminderDate = new Date(year, month - 1, day, REMINDER_HOUR, 0, 0, 0);
  reminderDate.setDate(reminderDate.getDate() - daysBefore);
  return reminderDate;
}

export async function scheduleItemReminder({
  daysBefore,
  itemId,
  itemName,
  targetDate,
}: ItemReminderInput) {
  const reminderDate = reminderDateFor(targetDate, daysBefore);

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
      title: `${itemName} ${timing}`,
      body: `Due date: ${targetDate}`,
      data: {
        itemId,
        type: 'item-reminder',
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
