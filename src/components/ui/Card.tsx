import { ReactNode } from 'react';
import { Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/hooks/use-theme';

export type CardProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  className?: string;
  onPress?: () => void;
  disabled?: boolean;
  variant?: 'default' | 'elevated' | 'glass' | 'tinted';
  haptic?: boolean;
  accessibilityLabel?: string;
  accessibilityRole?: 'button';
};

export default function Card({
  children,
  style,
  className = '',
  onPress,
  disabled,
  variant = 'default',
  haptic = true,
  accessibilityLabel,
  accessibilityRole,
}: CardProps) {
  const colors = useTheme();

  const handlePress = () => {
    if (disabled || !onPress) return;
    if (haptic) {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    onPress();
  };

  const variantStyles: ViewStyle = {
    backgroundColor: variant === 'tinted' ? colors.primarySoft : colors.surface,
    borderColor: variant === 'glass' ? colors.borderHighlight : colors.border,
    borderWidth: StyleSheet.hairlineWidth || 1,
    borderRadius: 24,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: variant === 'elevated' ? 0.08 : 0.03,
    shadowRadius: 12,
    elevation: variant === 'elevated' ? 3 : 1,
  };

  if (onPress) {
    return (
      <Pressable
        accessibilityLabel={accessibilityLabel}
        accessibilityRole={accessibilityRole ?? 'button'}
        className={className}
        disabled={disabled}
        onPress={handlePress}
        style={({ pressed }) => [
          variantStyles,
          { opacity: pressed ? 0.88 : 1, transform: [{ scale: pressed ? 0.985 : 1 }] },
          style,
        ]}>
        {children}
      </Pressable>
    );
  }

  return (
    <View className={className} style={[variantStyles, style]}>
      {children}
    </View>
  );
}
