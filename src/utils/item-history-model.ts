import { parseStoredDate } from './item-form';

type ItemHistoryRow = {
  action: string;
  createdAt: string;
  id: number;
  newDate: string | null;
  previousDate: string | null;
};

function formatCalendarDate(value: string | null, locale?: string, timeZone?: string) {
  if (!value) return undefined;
  const parsed = parseStoredDate(value);
  if (!parsed) return undefined;
  const stableDate = new Date(Date.UTC(
    parsed.getFullYear(),
    parsed.getMonth(),
    parsed.getDate(),
    12,
  ));
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'long',
    timeZone,
    year: 'numeric',
  }).format(stableDate);
}

export function buildRenewalHistoryModel(
  row: ItemHistoryRow,
  locale?: string,
  timeZone?: string,
) {
  if (row.action !== 'renewed') return undefined;
  const previousDate = formatCalendarDate(row.previousDate, locale, timeZone);
  const newDate = formatCalendarDate(row.newDate, locale, timeZone);
  const changedDate = new Date(row.createdAt);
  if (!previousDate || !newDate || Number.isNaN(changedDate.getTime())) return undefined;

  const dateFormatter = new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'long',
    timeZone,
    year: 'numeric',
  });
  const timeFormatter = new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    hourCycle: 'h23',
    minute: '2-digit',
    timeZone,
  });

  return {
    id: row.id,
    changedAt: `${dateFormatter.format(changedDate)}, ${timeFormatter.format(changedDate)}`,
    newDate,
    previousDate,
  };
}
