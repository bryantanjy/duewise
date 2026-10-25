import Svg, { Circle } from 'react-native-svg';
import { StyleProp, Text, View, ViewStyle } from 'react-native';
import { daysUntil } from '@/utils/dates';
import { useTheme } from '@/hooks/use-theme';

export type CountdownProps = {
  targetDate: string;
  size?: number;
  strokeWidth?: number;
  showLabel?: boolean;
  inverse?: boolean;
  style?: StyleProp<ViewStyle>;
};

export default function Countdown({
  targetDate,
  size = 72,
  strokeWidth = 6,
  showLabel = true,
  inverse = false,
  style,
}: CountdownProps) {
  const colors = useTheme();
  const days = daysUntil(targetDate);

  // Status colors & calculation
  const isOverdue = days < 0;
  const isToday = days === 0;
  const isUrgent = days > 0 && days <= 7;

  const ringColor = isOverdue
    ? colors.danger
    : isToday || isUrgent
      ? colors.warning
      : colors.primary;

  const bgColor = inverse
    ? 'rgba(255, 255, 255, 0.14)'
    : isOverdue
      ? colors.dangerSoft
      : isToday || isUrgent
        ? colors.warningSoft
        : colors.primarySoft;

  // Visual percentage for remaining (based on 30-day window or 365-day)
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Clamp progress between 0 and 1
  const progressRatio = isOverdue
    ? 1
    : isToday
      ? 1
      : Math.max(0.08, Math.min(1, 1 - days / 30));

  const strokeDashoffset = circumference * (1 - progressRatio);

  const displayDays = Math.abs(days);
  const statusSubtext = isOverdue
    ? 'OVERDUE'
    : isToday
      ? 'DUE TODAY'
      : days === 1
        ? 'DAY LEFT'
        : 'DAYS LEFT';

  return (
    <View style={[{ alignItems: 'center', justifyContent: 'center' }, style]}>
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <Svg height={size} style={{ position: 'absolute' }} width={size}>
          {/* Background Track */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            fill="transparent"
            r={radius}
            stroke={bgColor}
            strokeWidth={strokeWidth}
          />
          {/* Progress Arc */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            fill="transparent"
            origin={`${size / 2}, ${size / 2}`}
            r={radius}
            rotation="-90"
            stroke={ringColor}
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            strokeWidth={strokeWidth}
          />
        </Svg>

        <View style={{ alignItems: 'center', justifyContent: 'center' }}>
          <Text
            style={{
              color: isOverdue ? colors.danger : inverse ? colors.onPrimary : colors.text,
              fontSize: size > 80 ? 26 : size > 60 ? 20 : 16,
              fontWeight: '800',
              fontVariant: ['tabular-nums'],
              letterSpacing: -0.5,
            }}>
            {isToday ? '!' : displayDays}
          </Text>
        </View>
      </View>

      {showLabel && (
        <Text
          style={{
            marginTop: 4,
            fontSize: 9,
            fontWeight: '700',
            letterSpacing: 1,
            color: isOverdue ? colors.danger : inverse ? colors.heroMuted : colors.textSecondary,
          }}>
          {statusSubtext}
        </Text>
      )}
    </View>
  );
}
