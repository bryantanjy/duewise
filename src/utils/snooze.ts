export type SnoozeChoice = 'hour' | 'tomorrow' | 'week' | Date;

export function resolveSnoozeDate(choice: SnoozeChoice, reminderTime = '09:00', now = new Date()) {
  let date: Date;
  if (choice instanceof Date) date = new Date(choice);
  else if (choice === 'hour') date = new Date(now.getTime() + 3600000);
  else {
    if (choice !== 'tomorrow' && choice !== 'week') throw new Error('Choose a valid snooze option.');
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(reminderTime)) throw new Error('Choose a valid reminder time.');
    const [hour, minute] = reminderTime.split(':').map(Number);
    date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + (choice === 'week' ? 7 : 1), hour, minute);
  }
  if (!Number.isFinite(date.getTime()) || date.getTime() <= now.getTime()) throw new Error('Choose a snooze date and time in the future.');
  return date;
}
