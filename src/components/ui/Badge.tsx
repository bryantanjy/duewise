import { ReactNode } from 'react';
import { StyleProp, Text, TextStyle, View, ViewStyle } from 'react-native';
import { useTheme } from '@/hooks/use-theme';

export type BadgeVariant = 'primary' | 'success' | 'warning' | 'danger' | 'neutral';

export type BadgeProps = {
  label: string;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  dot?: boolean;
  icon?: ReactNode;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
};

export default function Badge({
  label,
  variant = 'primary',
  size = 'md',
  dot = false,
  icon,
  style,
  textStyle,
}: BadgeProps) {
  const colors = useTheme();

  const getColors = () => {
    switch (variant) {
      case 'success':
        return { bg: colors.successSoft, text: colors.success, dot: colors.success };
      case 'warning':
        return { bg: colors.warningSoft, text: colors.warning, dot: colors.warning };
      case 'danger':
        return { bg: colors.dangerSoft, text: colors.danger, dot: colors.danger };
      case 'neutral':
        return { bg: colors.surfaceInset, text: colors.textSecondary, dot: colors.textSecondary };
      case 'primary':
      default:
        return { bg: colors.primarySoft, text: colors.primary, dot: colors.primary };
    }
  };

  const badgeColors = getColors();
  const isSm = size === 'sm';

  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          alignSelf: 'flex-start',
          backgroundColor: badgeColors.bg,
          paddingHorizontal: isSm ? 8 : 11,
          paddingVertical: isSm ? 3 : 5,
          borderRadius: 999,
        },
        style,
      ]}>
      {dot && (
        <View
          style={{
            width: isSm ? 5 : 6,
            height: isSm ? 5 : 6,
            borderRadius: 3,
            backgroundColor: badgeColors.dot,
            marginRight: 6,
          }}
        />
      )}
      {icon && <View style={{ marginRight: 5 }}>{icon}</View>}
      <Text
        style={[
          {
            color: badgeColors.text,
            fontSize: isSm ? 11 : 12,
            fontWeight: '600',
            letterSpacing: 0.3,
          },
          textStyle,
        ]}>
        {label}
      </Text>
    </View>
  );
}
