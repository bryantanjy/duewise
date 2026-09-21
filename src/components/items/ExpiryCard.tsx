import ArrowRight from 'lucide-react-native/icons/arrow-right';
import Calendar from 'lucide-react-native/icons/calendar';
import { Pressable, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import Countdown from '@/components/items/Countdown';
import { statusText } from '@/components/items/StatusBadge';
import { useTheme } from '@/hooks/use-theme';
import { formatDay, formatMonth } from '@/utils/dates';

export type ExpiryCardData = {
  id: number;
  name: string;
  targetDate: string;
  categoryName?: string | null;
  categoryColor?: string | null;
  repeatType?: string | null;
  importance?: string | null;
};

export type ExpiryCardProps = {
  item: ExpiryCardData;
  onPress: () => void;
};

export default function ExpiryCard({ item, onPress }: ExpiryCardProps) {
  const colors = useTheme();

  const handlePress = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onPress();
  };

  return (
    <Pressable
      accessibilityLabel={`Next on your horizon: ${item.name}`}
      accessibilityRole="button"
      className="mt-6 overflow-hidden rounded-[28px] border border-white/10 active:opacity-95"
      onPress={handlePress}
      style={{
        backgroundColor: colors.hero,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
        elevation: 6,
      }}>
      {/* Decorative ambient background rings */}
      <View
        className="pointer-events-none absolute -right-12 -top-12 h-52 w-52 rounded-full border border-white/10"
        style={{ opacity: 0.7 }}
      />
      <View
        className="pointer-events-none absolute -right-2 -top-2 h-36 w-36 rounded-full border border-white/10"
        style={{ opacity: 0.5 }}
      />
      <View
        className="pointer-events-none absolute -bottom-16 -left-10 h-44 w-44 rounded-full bg-white/5"
        style={{ opacity: 0.3 }}
      />

      <View className="p-6">
        {/* Top Tag Row */}
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center rounded-full bg-white/10 px-3 py-1">
            <View
              className="mr-2 h-2 w-2 rounded-full"
              style={{ backgroundColor: item.categoryColor ?? colors.heroAccent }}
            />
            <Text
              className="text-[11px] font-bold uppercase tracking-[1.5px]"
              style={{ color: colors.heroAccent }}>
              {item.categoryName ?? 'Horizon'}
            </Text>
          </View>

          <View className="flex-row items-center">
            <Calendar color={colors.heroMuted} size={14} />
            <Text className="ml-1.5 text-xs font-semibold" style={{ color: colors.heroMuted }}>
              {formatMonth(item.targetDate)} {formatDay(item.targetDate)}
            </Text>
          </View>
        </View>

        {/* Content & Countdown Row */}
        <View className="mt-5 flex-row items-center justify-between">
          <View className="flex-1 pr-4">
            <Text
              className="text-2xl font-bold leading-8 text-white"
              numberOfLines={2}
              style={{ letterSpacing: -0.5 }}>
              {item.name}
            </Text>
            <Text className="mt-1.5 text-sm" style={{ color: colors.heroMuted }}>
              {item.repeatType === 'yearly' ? 'Renews annually' : 'One-time reminder'}
            </Text>
          </View>

          <View className="rounded-2xl border border-white/15 bg-white/10 p-2.5">
            <Countdown
              size={64}
              strokeWidth={5}
              targetDate={item.targetDate}
            />
          </View>
        </View>

        {/* Footer Row */}
        <View className="mt-6 flex-row items-center justify-between border-t border-white/10 pt-4">
          <View className="flex-row items-center">
            <View
              className="mr-2 h-2 w-2 rounded-full bg-emerald-400"
              style={{
                shadowColor: '#34D399',
                shadowOpacity: 0.8,
                shadowRadius: 4,
              }}
            />
            <Text className="text-sm font-semibold text-white">
              {statusText(item.targetDate)}
            </Text>
          </View>

          <View className="flex-row items-center">
            <Text className="mr-1 text-xs font-semibold text-white/80">View details</Text>
            <ArrowRight color="#FFFFFF" size={16} />
          </View>
        </View>
      </View>
    </Pressable>
  );
}
