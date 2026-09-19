export function parseLocalDate(value: string, hour = 0) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day, hour, 0, 0, 0);
}

export function toDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function daysUntil(value: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((parseLocalDate(value).getTime() - today.getTime()) / 86_400_000);
}

export function formatMonth(value: string) {
  return new Intl.DateTimeFormat(undefined, { month: 'short' })
    .format(parseLocalDate(value))
    .toUpperCase();
}

export function formatDay(value: string) {
  return String(parseLocalDate(value).getDate()).padStart(2, '0');
}

export function nextYearDate(value: string) {
  const current = parseLocalDate(value);
  const targetYear = current.getFullYear() + 1;
  const targetMonth = current.getMonth();
  const lastDayOfTargetMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
  return toDateInput(
    new Date(targetYear, targetMonth, Math.min(current.getDate(), lastDayOfTargetMonth)),
  );
}
