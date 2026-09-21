import { Text, View } from 'react-native';
import { daysUntil } from '@/utils/dates';
import { useTheme } from '@/hooks/use-theme';

export function statusText(targetDate: string) {
  const days = daysUntil(targetDate);
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return 'Due today';
  if (days === 1) return 'Tomorrow';
  return `${days}d left`;
}

export default function StatusBadge({ targetDate }: { targetDate: string }) {
  const colors = useTheme();
  const days = daysUntil(targetDate);

  const isOverdue = days < 0;
  const isUrgent = days >= 0 && days <= 7;

  const bg = isOverdue
    ? colors.dangerSoft
    : isUrgent
      ? colors.warningSoft
      : colors.primarySoft;

  const textColor = isOverdue
    ? colors.danger
    : isUrgent
      ? colors.warning
      : colors.primary;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: bg,
        paddingHorizontal: 9,
        paddingVertical: 4,
        borderRadius: 999,
      }}>
      <View
        style={{
          width: 5,
          height: 5,
          borderRadius: 2.5,
          backgroundColor: textColor,
          marginRight: 5,
        }}
      />
      <Text
        style={{
          color: textColor,
          fontSize: 11,
          fontWeight: '700',
          letterSpacing: 0.2,
          fontVariant: ['tabular-nums'],
        }}>
        {statusText(targetDate)}
      </Text>
    </View>
  );
}

