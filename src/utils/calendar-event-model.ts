export type CalendarEventSource = {
  categoryColor: string | null;
  categoryName: string | null;
  id: number;
  importance: string;
  name: string;
  repeatType: string;
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
    categoryLabel: `${categoryName}${item.repeatType === 'yearly' ? ' · Yearly' : ''}`,
    date: occurrenceDate,
    highImportance: item.importance === 'high',
    id: item.id,
    title: item.name.trim() || 'Untitled item',
  };
}
