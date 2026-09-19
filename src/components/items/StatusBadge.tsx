import { Text, View } from 'react-native';

import { daysUntil } from '@/utils/dates';

export function statusText(targetDate: string) {
  const days = daysUntil(targetDate);
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return 'Due today';
  if (days === 1) return 'Tomorrow';
  return `${days}d left`;
}

export default function StatusBadge({ targetDate }: { targetDate: string }) {
  const days = daysUntil(targetDate);
  const background =
    days < 0
      ? 'bg-app-danger-soft'
      : days <= 7
        ? 'bg-app-warning-soft'
        : 'bg-app-primary-soft';
  const textColor =
    days < 0 ? 'text-app-danger' : days <= 7 ? 'text-app-warning' : 'text-app-primary';

  return (
    <View className={`rounded-full px-3 py-1.5 ${background}`}>
      <Text className={`text-xs font-semibold ${textColor}`}>{statusText(targetDate)}</Text>
    </View>
  );
}
