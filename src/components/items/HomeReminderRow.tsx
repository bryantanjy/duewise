import { Pressable, Text, View, useWindowDimensions } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { daysUntil, formatDay, formatMonth } from '@/utils/dates';
import { repeatLabel } from '@/utils/recurrence';
import type { ItemRowData } from './ItemRow';

type Props = { item: ItemRowData; onPress: () => void; showDivider?: boolean };
export default function HomeReminderRow({ item, onPress, showDivider }: Props) {
  const colors = useTheme();
  const { width, fontScale } = useWindowDimensions();
  const stacked = width < 360 || fontScale > 1.3;
  const days = daysUntil(item.targetDate);
  const status = days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : `In ${days} days`;
  const statusColor = days < 0 ? colors.danger : days <= 7 ? colors.warning : colors.textSecondary;
  const metadata = `${item.categoryName ?? 'Uncategorized'}${item.repeatType !== 'none' ? ` / ${repeatLabel(item.repeatType, item.repeatInterval)}` : ''}`;
  return <Pressable accessibilityRole="button" accessibilityLabel={`${item.name}, ${status}, ${metadata}`}
    onPress={onPress} style={({ pressed }) => ({ paddingVertical: 18, paddingHorizontal: 18,
      minHeight: 88, flexDirection: 'row', alignItems: 'center', gap: 14,
      borderTopWidth: showDivider ? 1 : 0, borderTopColor: colors.border,
      backgroundColor: pressed ? colors.surfaceInset : colors.surface })}>
    <View style={{ width: 34, alignItems: 'center' }}>
      <Text style={{ fontSize: 10, lineHeight: 16, letterSpacing: 0.8, color: colors.textSecondary }}>{formatMonth(item.targetDate)}</Text>
      <Text style={{ fontSize: 23, lineHeight: 29, letterSpacing: -0.5, fontWeight: '500', color: colors.text, fontVariant: ['tabular-nums'] }}>{formatDay(item.targetDate)}</Text>
    </View>
    <View style={{ flex: 1, minWidth: 0 }}>
      <Text numberOfLines={2} style={{ fontSize: 15, lineHeight: 22, fontWeight: '600', letterSpacing: -0.15, color: colors.text }}>{item.name}</Text>
      <Text numberOfLines={2} style={{ fontSize: 12, lineHeight: 18, color: colors.textSecondary, marginTop: 3 }}>{metadata}</Text>
      {stacked ? <Text style={{ fontSize: 12, lineHeight: 18, color: statusColor, marginTop: 4 }}>{status}</Text> : null}
      {item.importance === 'high' ? <Text style={{ fontSize: 11, lineHeight: 17, color: colors.danger, marginTop: 3 }}>High priority</Text> : null}
    </View>
    {!stacked ? <Text style={{ maxWidth: 82, fontSize: 12, lineHeight: 18, fontWeight: '500', textAlign: 'right', color: statusColor }}>{status}</Text> : null}
  </Pressable>;
}
