export const HOME_WIDGET_NAME = 'DuewiseUpcoming';
export type WidgetItem = { id: number; name: string; targetDate: string; archived: boolean | number };
export type WidgetModel = {
  rows: { id: number; name: string; date: string; status: string; url: string }[];
  overdueCount: number;
  upcomingCount: number;
  updatedLabel: string;
};

export function widgetDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return widgetDateKey(date) === value;
}

export function buildWidgetModel(items: readonly WidgetItem[], now = new Date()): WidgetModel {
  const today = widgetDateKey(now);
  const active = items.filter((item) => !item.archived && Number.isSafeInteger(item.id) && item.id > 0 && validDate(item.targetDate));
  const upcoming = active.filter((item) => item.targetDate >= today)
    .sort((a, b) => a.targetDate.localeCompare(b.targetDate) || a.id - b.id);
  const todayNumber = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return {
    rows: upcoming.slice(0, 3).map((item) => {
      const [year, month, day] = item.targetDate.split('-').map(Number);
      const days = Math.round((Date.UTC(year, month - 1, day) - todayNumber) / 86400000);
      return { id: item.id, name: item.name, url: `lifereminder://item/${item.id}`,
        date: new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(year, month - 1, day)),
        status: days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : `In ${days} days` };
    }),
    overdueCount: active.length - upcoming.length,
    upcomingCount: upcoming.length,
    updatedLabel: new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(now),
  };
}

export function buildWidgetTimeline(items: readonly WidgetItem[], now = new Date()) {
  return Array.from({ length: 32 }, (_, index) => {
    const date = index === 0 ? new Date(now) : new Date(now.getFullYear(), now.getMonth(), now.getDate() + index);
    return { date, props: buildWidgetModel(items, date) };
  });
}
