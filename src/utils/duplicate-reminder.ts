type Source = {
  name: string; categoryId: number | null; dateType: string; targetDate: string;
  reminderTime: string; importance: string; repeatType: string; repeatInterval: number;
  notes: string | null; costMinor: number | null; costCurrency: string | null;
};
// Explicitly select editable values so device IDs, archive state and history never enter a new draft.
export function duplicateReminderDraft(source: Source, reminders: readonly { daysBefore: number; enabled: boolean; isSnooze: boolean }[]) {
  return {
    name: `${source.name} (copy)`, categoryId: source.categoryId, dateType: source.dateType,
    targetDate: source.targetDate, reminderTime: source.reminderTime, importance: source.importance,
    repeatType: source.repeatType, repeatInterval: source.repeatInterval, notes: source.notes,
    costMinor: source.costMinor, costCurrency: source.costCurrency,
    reminderDays: [...new Set(reminders.filter(row => row.enabled && !row.isSnooze).map(row => row.daysBefore))].sort((a, b) => b - a),
  };
}
