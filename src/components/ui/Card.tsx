import { ReactNode } from 'react';
import { Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { useTheme } from '@/hooks/use-theme';

export type CardProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  className?: string;
  onPress?: () => void;
  disabled?: boolean;
  variant?: 'default' | 'elevated' | 'glass' | 'tinted';
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
  accessibilityLabel,
  accessibilityRole,
}: CardProps) {
  const colors = useTheme();

  const handlePress = () => {
    if (disabled || !onPress) return;
    onPress();
  };

  const variantStyles: ViewStyle = {
    backgroundColor: variant === 'tinted' ? colors.primarySoft : colors.surface,
    borderColor: variant === 'glass' ? colors.borderHighlight : colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 20,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: variant === 'elevated' ? 0.14 : 0.04,
    shadowRadius: variant === 'elevated' ? 22 : 10,
    elevation: variant === 'elevated' ? 4 : 0,
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
          { opacity: pressed ? 0.92 : 1, transform: [{ scale: pressed ? 0.99 : 1 }] },
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
