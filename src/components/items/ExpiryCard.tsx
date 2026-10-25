import ArrowRight from 'lucide-react-native/icons/arrow-right';
import { Pressable, Text, View, useWindowDimensions } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { daysUntil } from '@/utils/dates';
import { formatDateForDisplay } from '@/utils/item-form';
import { repeatLabel } from '@/utils/recurrence';

export type ExpiryCardData = {
  id: number; name: string; targetDate: string; categoryName?: string | null;
  categoryColor?: string | null; repeatType?: string | null; repeatInterval?: number; importance?: string | null;
};
export type ExpiryCardProps = { item: ExpiryCardData; onPress: () => void };

export default function ExpiryCard({ item, onPress }: ExpiryCardProps) {
  const colors = useTheme();
  const { width, fontScale } = useWindowDimensions();
  const stacked = fontScale > 1.3;
  const days = daysUntil(item.targetDate);
  const countdown = days === 0 ? 'Today' : String(Math.abs(days));
  const countdownLabel = days < 0 ? Math.abs(days) === 1 ? 'day overdue' : 'days overdue' : days === 0 ? 'due today' : days === 1 ? 'day to go' : 'days to go';
  const recurrence = item.repeatType && item.repeatType !== 'none'
    ? `Repeats ${repeatLabel(item.repeatType, item.repeatInterval).toLowerCase()} after completion`
    : 'One-time reminder';
  return (
    <Pressable accessibilityRole="button"
      accessibilityLabel={`${item.name}, due ${formatDateForDisplay(item.targetDate)}, ${days === 0 ? 'today' : `${Math.abs(days)} ${countdownLabel}`}`}
      accessibilityHint="View reminder details"
      onPress={onPress} style={({ pressed }) => ({
        backgroundColor: colors.hero, borderColor: colors.heroBorder, borderWidth: 1,
        borderRadius: 20, padding: 22, opacity: pressed ? 0.92 : 1,
      })}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: item.categoryColor ?? colors.heroAccent }} />
          <Text style={{ fontSize: 12, fontWeight: '500', color: colors.heroMuted }}>{item.categoryName ?? 'Reminder'}</Text>
        </View>
        {item.importance === 'high' ? <Text style={{ fontSize: 12, color: colors.heroAccent }}>High priority</Text> : null}
      </View>
      <View style={{ flexDirection: stacked ? 'column' : 'row', alignItems: stacked ? 'flex-start' : 'center', gap: 20, marginTop: 22 }}>
        <View style={{ flex: stacked ? undefined : 1, minWidth: 0 }}>
          <Text numberOfLines={3} style={{ fontSize: width < 360 ? 22 : 26, lineHeight: width < 360 ? 29 : 33, fontWeight: '600', letterSpacing: -0.7, color: colors.onPrimary }}>{item.name}</Text>
          <Text style={{ marginTop: 8, fontSize: 13, lineHeight: 20, color: colors.heroMuted }}>{formatDateForDisplay(item.targetDate)}</Text>
        </View>
        <View style={{ alignItems: stacked ? 'flex-start' : 'flex-end' }}>
          <Text style={{ color: colors.onPrimary, fontSize: days === 0 ? 28 : width < 360 ? 34 : 40, lineHeight: days === 0 ? 36 : width < 360 ? 40 : 46,
            fontWeight: '500', letterSpacing: -1.5, fontVariant: ['tabular-nums'] }}>{countdown}</Text>
          {days !== 0 ? <Text style={{ fontSize: 12, color: colors.heroMuted, marginTop: 2 }}>{countdownLabel}</Text> : null}
        </View>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 22,
        borderTopWidth: 1, borderTopColor: colors.heroBorder, paddingTop: 14 }}>
        <Text style={{ flex: 1, fontSize: 12, lineHeight: 18, color: colors.heroMuted }}>{recurrence}</Text>
        <ArrowRight color={colors.heroAccent} size={18} strokeWidth={1.7} />
      </View>
    </Pressable>
  );
}
