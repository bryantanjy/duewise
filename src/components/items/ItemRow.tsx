import { Pressable, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';

import { formatDay, formatMonth, daysUntil } from '@/utils/dates';
import { useTheme } from '@/hooks/use-theme';

import StatusBadge from './StatusBadge';

export type ItemRowData = {
  categoryColor: string | null;
  categoryName: string | null;
  id: number;
  importance: string;
  name: string;
  repeatType: string;
  targetDate: string;
};

type ItemRowProps = {
  item: ItemRowData;
  onPress: () => void;
  showDivider?: boolean;
};

export default function ItemRow({ item, onPress, showDivider = false }: ItemRowProps) {
  const colors = useTheme();
  const days = daysUntil(item.targetDate);
  const isOverdue = days < 0;
  const isUrgent = days >= 0 && days <= 7;

  const handlePress = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onPress();
  };

  return (
    <Pressable
      accessibilityLabel={`${item.name}, due ${item.targetDate}`}
      accessibilityRole="button"
      className={`min-h-[82px] flex-row items-center px-4 py-3.5 active:opacity-80 ${
        showDivider ? 'border-t border-app-border' : ''
      }`}
      onPress={handlePress}
      style={({ pressed }) => [
        {
          backgroundColor: pressed ? colors.primarySoft : 'transparent',
        },
      ]}>
      {/* Date badge */}
      <View
        className="w-[52px] items-center rounded-2xl py-2"
        style={{
          backgroundColor: isOverdue
            ? colors.dangerSoft
            : isUrgent
              ? colors.warningSoft
              : colors.primarySoft,
        }}>
        <Text
          className="text-[10px] font-extrabold tracking-wider"
          style={{
            color: isOverdue ? colors.danger : isUrgent ? colors.warning : colors.primary,
          }}>
          {formatMonth(item.targetDate)}
        </Text>
        <Text
          className="mt-0.5 text-2xl font-bold tracking-tight"
          style={{
            color: isOverdue ? colors.danger : colors.text,
            fontVariant: ['tabular-nums'],
          }}>
          {formatDay(item.targetDate)}
        </Text>
      </View>

      {/* Main content */}
      <View className="ml-3.5 flex-1 pr-2">
        <View className="flex-row items-center">
          <View
            className="mr-2 h-2 w-2 rounded-full"
            style={{ backgroundColor: item.categoryColor ?? colors.textSecondary }}
          />
          <Text className="text-xs font-semibold text-app-muted" numberOfLines={1}>
            {item.categoryName ?? 'Uncategorized'}
            {item.repeatType === 'yearly' ? ' · Yearly' : ''}
          </Text>
        </View>
        <Text
          className="mt-1 text-[15px] font-semibold tracking-tight text-app-text"
          numberOfLines={1}>
          {item.name}
        </Text>
      </View>

      {/* Status & urgency */}
      <View className="items-end pl-1">
        <StatusBadge targetDate={item.targetDate} />
        {item.importance === 'high' ? (
          <View className="mt-1.5 rounded px-1.5 py-0.5" style={{ backgroundColor: colors.dangerSoft }}>
            <Text className="text-[9px] font-extrabold tracking-widest text-app-danger">
              HIGH
            </Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

