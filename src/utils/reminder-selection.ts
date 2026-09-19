export const REMINDER_PRESETS = [
  { days: 30, label: '30 days' },
  { days: 14, label: '2 weeks' },
  { days: 7, label: '1 week' },
  { days: 3, label: '3 days' },
  { days: 1, label: '1 day' },
  { days: 0, label: 'Due day' },
] as const;

export const DEFAULT_REMINDER_DAYS = [30, 7, 1, 0];

export function normalizeReminderDays(days: number[]) {
  return [...new Set(days)].sort((left, right) => right - left);
}

export function toggleReminderDay(selected: number[], day: number) {
  return normalizeReminderDays(
    selected.includes(day) ? selected.filter((value) => value !== day) : [...selected, day],
  );
}

export function resolveReminderSelection(selected: number[], customText: string) {
  const custom = customText.trim();
  if (!custom) return { values: normalizeReminderDays(selected) };
  if (!/^\d+$/.test(custom)) return { error: 'Enter a whole number of days.' };

  const day = Number(custom);
  if (!Number.isSafeInteger(day) || day > 3650) {
    return { error: 'Choose a day from 0 to 3650.' };
  }

  return { values: normalizeReminderDays([...selected, day]) };
}
