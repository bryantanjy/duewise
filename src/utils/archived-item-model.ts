type ArchivedItemRow = {
  categoryColor: string | null;
  categoryName: string | null;
  id: number;
  importance: string;
  name: string;
  reminderCount: number;
  repeatType: string;
  targetDate: string;
};

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

export function buildArchivedItemModel(row: ArchivedItemRow) {
  const reminderCount = Number.isFinite(row.reminderCount)
    ? Math.max(0, Math.trunc(row.reminderCount))
    : 0;
  const reminderLabel = reminderCount === 0
    ? 'No reminder days saved'
    : reminderCount === 1
      ? '1 reminder day saved'
      : `${reminderCount} reminder days saved`;

  return {
    categoryColor: row.categoryColor && HEX_COLOR.test(row.categoryColor)
      ? row.categoryColor
      : '#737373',
    categoryName: row.categoryName?.trim() || 'Uncategorized',
    id: row.id,
    importance: row.importance,
    name: row.name.trim() || 'Untitled item',
    reminderLabel,
    repeatType: row.repeatType,
    targetDate: row.targetDate,
  };
}
