import { parseLocalDate, toDateInput } from './dates';

export const REPEAT_OPTIONS = [
  { value: 'none', label: 'Never' }, { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' }, { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' }, { value: 'custom', label: 'Every N days' },
] as const;
export type RepeatType = typeof REPEAT_OPTIONS[number]['value'];

export function repeatLabel(type: string, interval = 1) {
  return type === 'custom' ? `Every ${interval} days` : REPEAT_OPTIONS.find((option) => option.value === type)?.label ?? 'Never';
}

export function nextOccurrence(value: string, type: string, interval = 1) {
  const date = parseLocalDate(value);
  if (type === 'monthly' || type === 'yearly') {
    const month = date.getMonth() + (type === 'yearly' ? 12 : 1);
    const lastDay = new Date(date.getFullYear(), month + 1, 0).getDate();
    return toDateInput(new Date(date.getFullYear(), month, Math.min(date.getDate(), lastDay)));
  }
  const days = type === 'daily' ? 1 : type === 'weekly' ? 7 : type === 'custom' ? interval : 0;
  if (!Number.isInteger(days) || days < 1 || days > 3650) throw new Error('Choose a repeat interval from 1 to 3650 days.');
  date.setDate(date.getDate() + days);
  return toDateInput(date);
}

// Missed occurrences advance to the next calendar date, avoiding a burst of old alerts.
export function nextFutureOccurrence(value: string, type: string, interval = 1, today = toDateInput(new Date())) {
  let next = nextOccurrence(value, type, interval);
  while (next < today) next = nextOccurrence(next, type, interval);
  return next;
}


export function occurrenceOnDate(targetDate: string, type: string, interval: number, dateKey: string) {
  if (dateKey < targetDate) return false;
  if (type === 'none') return dateKey === targetDate;
  const start = parseLocalDate(targetDate);
  const date = parseLocalDate(dateKey);
  if (type === 'monthly' || type === 'yearly') {
    let occurrence = targetDate;
    while (occurrence < dateKey) occurrence = nextOccurrence(occurrence, type, interval);
    return occurrence === dateKey;
  }
  const days = (Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) - Date.UTC(start.getFullYear(), start.getMonth(), start.getDate())) / 86400000;
  const step = type === 'daily' ? 1 : type === 'weekly' ? 7 : type === 'custom' ? interval : 0;
  return step > 0 && days % step === 0;
}
