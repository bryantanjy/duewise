import { parseStoredDate } from './item-form';
import { reminderDateFor } from './reminder-time';

export type CalendarExportSource = {
  id: number; name: string; targetDate: string; reminderTime: string; notes: string | null;
};

export function buildCalendarExport(item: CalendarExportSource) {
  if (!parseStoredDate(item.targetDate)) throw new Error('Choose a valid due date before exporting.');
  const startDate = reminderDateFor(item.targetDate, 0, item.reminderTime);
  return {
    title: item.name.trim() || 'Duewise reminder',
    startDate,
    endDate: new Date(startDate.getTime() + 30 * 60000),
    allDay: false,
    notes: ['Created from Duewise. This is a copy of the current due date; changes do not sync with Duewise.', item.notes?.trim()].filter(Boolean).join('\n\n'),
  };
}
