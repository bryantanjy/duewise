import { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/hooks/use-theme';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export type ButtonProps = {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  icon?: ReactNode;
  iconPosition?: 'left' | 'right';
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  haptic?: boolean;
  fullWidth?: boolean;
  accessibilityLabel?: string;
};

export default function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon,
  iconPosition = 'left',
  style,
  textStyle,
  haptic = true,
  fullWidth = false,
  accessibilityLabel,
}: ButtonProps) {
  const colors = useTheme();

  const handlePress = () => {
    if (disabled || loading) return;
    if (haptic) {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }
    onPress();
  };

  const getContainerStyle = (): ViewStyle => {
    const base: ViewStyle = {
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      borderRadius: size === 'sm' ? 14 : size === 'lg' ? 22 : 18,
      alignSelf: fullWidth ? 'stretch' : 'flex-start',
    };

    switch (size) {
      case 'sm':
        base.paddingHorizontal = 14;
        base.minHeight = 38;
        break;
      case 'lg':
        base.paddingHorizontal = 24;
        base.minHeight = 56;
        break;
      case 'md':
      default:
        base.paddingHorizontal = 18;
        base.minHeight = 48;
        break;
    }

    switch (variant) {
      case 'secondary':
        base.backgroundColor = colors.primarySoft;
        break;
      case 'outline':
        base.backgroundColor = 'transparent';
        base.borderColor = colors.border;
        base.borderWidth = 1.5;
        break;
      case 'ghost':
        base.backgroundColor = 'transparent';
        break;
      case 'danger':
        base.backgroundColor = colors.danger;
        break;
      case 'primary':
      default:
        base.backgroundColor = colors.primaryFill;
        base.shadowColor = colors.primary;
        base.shadowOffset = { width: 0, height: 4 };
        base.shadowOpacity = 0.25;
        base.shadowRadius = 8;
        base.elevation = 4;
        break;
    }

    if (disabled) {
      base.opacity = 0.45;
    }

    return base;
  };

  const getTextColor = (): string => {
    switch (variant) {
      case 'secondary':
        return colors.primary;
      case 'outline':
        return colors.text;
      case 'ghost':
        return colors.primary;
      case 'danger':
        return '#FFFFFF';
      case 'primary':
      default:
        return '#FFFFFF';
    }
  };

  const textFontSize = size === 'sm' ? 13 : size === 'lg' ? 16 : 14;

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading }}
      disabled={disabled || loading}
      onPress={handlePress}
      style={({ pressed }) => [
        getContainerStyle(),
        {
          opacity: pressed ? 0.85 : disabled ? 0.45 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={getTextColor()} size="small" style={{ marginRight: 8 }} />
      ) : icon && iconPosition === 'left' ? (
        <View style={{ marginRight: 8 }}>{icon}</View>
      ) : null}

      <Text
        style={[
          {
            color: getTextColor(),
            fontSize: textFontSize,
            fontWeight: '600',
            letterSpacing: 0.2,
          },
          textStyle,
        ]}>
        {title}
      </Text>

      {!loading && icon && iconPosition === 'right' ? (
        <View style={{ marginLeft: 8 }}>{icon}</View>
      ) : null}
    </Pressable>
  );
}
