export const DEFAULT_REMINDER_TIME = '09:00';

export function reminderDateFor(targetDate: string, daysBefore: number, time = DEFAULT_REMINDER_TIME) {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new Error('Choose a valid reminder time.');
  const [year, month, day] = targetDate.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  const date = new Date(year, month - 1, day, hour, minute, 0, 0);
  date.setDate(date.getDate() - daysBefore);
  return date;
}

export function toStoredTime(date: Date) {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export function formatReminderTime(time: string) {
  return reminderDateFor('2000-01-01', 0, time).toLocaleTimeString(undefined, {
    hour: 'numeric', minute: '2-digit',
  });
}
