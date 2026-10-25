export type ReminderDeviceStatus = {
  state: 'ready' | 'blocked' | 'unsupported' | 'error';
  notifications: { id: string; scheduledFor?: string }[];
};

export function reminderStatusLabel(notificationId: string | null, status?: ReminderDeviceStatus) {
  if (!status) return 'Checking...';
  if (status.state === 'unsupported') return 'Unavailable here';
  if (status.state === 'error') return 'Unable to verify';
  if (status.state === 'blocked') return 'Notifications disabled';
  return notificationId && status.notifications.some((row) => row.id === notificationId)
    ? 'Scheduled' : 'Not scheduled';
}

export function nextScheduledReminder(status: ReminderDeviceStatus | undefined, ids: (string | null)[], now = Date.now()) {
  if (status?.state !== 'ready') return undefined;
  return status.notifications.filter((row) => ids.includes(row.id) && row.scheduledFor && Date.parse(row.scheduledFor) > now)
    .sort((a, b) => Date.parse(a.scheduledFor!) - Date.parse(b.scheduledFor!))[0]?.scheduledFor;
}

export function alertScheduleStatus(input: {
  notificationId: string | null; scheduledFor?: string; enabled: boolean;
  archived: boolean; deviceStatus?: ReminderDeviceStatus; now?: number;
}) {
  if (input.archived) return 'Paused';
  if (!input.enabled) return 'Off';
  const status = reminderStatusLabel(input.notificationId, input.deviceStatus);
  if (status === 'Not scheduled' && input.scheduledFor && Date.parse(input.scheduledFor) <= (input.now ?? Date.now())) return 'Time passed';
  return status;
}

export function isMissingFutureAlert(input: {
  notificationId: string | null; scheduledFor?: string; enabled: boolean;
  isSnooze: boolean; archived: boolean; deviceStatus?: ReminderDeviceStatus; now?: number;
}) {
  return !input.archived && input.enabled && !input.isSnooze && input.deviceStatus?.state === 'ready'
    && Boolean(input.scheduledFor && Date.parse(input.scheduledFor) > (input.now ?? Date.now()))
    && reminderStatusLabel(input.notificationId, input.deviceStatus) !== 'Scheduled';
}
