import { formatDateForDisplay } from './item-form';
import { repeatLabel } from './recurrence';
import { formatCost } from './subscription-cost';

type ShareSource = {
  name: string; targetDate: string; repeatType: string; repeatInterval: number;
  archived: boolean; costMinor?: number | null; costCurrency?: string | null;
};
export function reminderShareContent(item: ShareSource) {
  const name = item.name.trim() || 'Reminder';
  const message = [
    name,
    `Due: ${formatDateForDisplay(item.targetDate)} (${item.targetDate})`,
    `Repeat: ${repeatLabel(item.repeatType, item.repeatInterval)}`,
    item.costMinor != null && item.costCurrency ? `Cost: ${formatCost(item.costMinor, item.costCurrency)} per occurrence` : undefined,
    item.archived ? 'Status: Archived' : undefined,
    '',
    'Shared from Duewise. This is a snapshot; later changes are not synced.',
  ].filter(line => line !== undefined).join('\n');
  return { title: name, message };
}
