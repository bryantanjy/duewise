import { Pressable, Text, View } from 'react-native';

import { formatDay, formatMonth } from '@/utils/dates';

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
  return (
    <Pressable
      accessibilityRole="button"
      className={`min-h-24 flex-row items-center px-4 py-4 active:bg-app-primary-soft ${
        showDivider ? 'border-t border-app-border' : ''
      }`}
      onPress={onPress}>
      <View className="w-14 items-center rounded-xl bg-app-primary-soft py-2">
        <Text className="text-[10px] font-bold tracking-wider text-app-primary">
          {formatMonth(item.targetDate)}
        </Text>
        <Text className="mt-0.5 text-2xl font-bold text-app-text">
          {formatDay(item.targetDate)}
        </Text>
      </View>

      <View className="ml-4 flex-1">
        <View className="flex-row items-center">
          <View
            className="mr-2 h-2 w-2 rounded-full"
            style={{ backgroundColor: item.categoryColor ?? '#737373' }}
          />
          <Text className="text-xs font-medium text-app-muted">
            {item.categoryName ?? 'Uncategorized'}
            {item.repeatType === 'yearly' ? ' · Yearly' : ''}
          </Text>
        </View>
        <Text className="mt-1 text-base font-semibold text-app-text" numberOfLines={1}>
          {item.name}
        </Text>
      </View>

      <View className="ml-3 items-end">
        <StatusBadge targetDate={item.targetDate} />
        {item.importance === 'high' ? (
          <Text className="mt-2 text-[10px] font-bold tracking-wider text-app-danger">HIGH</Text>
        ) : null}
      </View>
    </Pressable>
  );
}
