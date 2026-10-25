import { repeatLabel } from './recurrence';

export type CalendarEventSource = {
  categoryColor: string | null;
  categoryName: string | null;
  id: number;
  importance: string;
  name: string;
  repeatType: string;
  repeatInterval?: number;
  targetDate: string;
};

export type CalendarEventModel = {
  categoryColor: string;
  categoryLabel: string;
  date: string;
  highImportance: boolean;
  id: number;
  title: string;
};

export function buildCalendarEventModel(
  item: CalendarEventSource,
  occurrenceDate: string,
): CalendarEventModel {
  const categoryName = item.categoryName?.trim() || 'Uncategorized';

  return {
    categoryColor: item.categoryColor || '#737373',
    categoryLabel: `${categoryName}${item.repeatType !== 'none' ? ` \u00b7 ${repeatLabel(item.repeatType, item.repeatInterval)}` : ''}`,
    date: occurrenceDate,
    highImportance: item.importance === 'high',
    id: item.id,
    title: item.name.trim() || 'Untitled item',
  };
}
