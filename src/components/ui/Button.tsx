import { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleProp,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
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
  fullWidth = false,
  accessibilityLabel,
}: ButtonProps) {
  const colors = useTheme();

  const handlePress = () => {
    if (disabled || loading) return;
    onPress();
  };

  const getContainerStyle = (): ViewStyle => {
    const base: ViewStyle = {
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      borderRadius: size === 'sm' ? 12 : size === 'lg' ? 18 : 15,
      alignSelf: fullWidth ? 'stretch' : 'flex-start',
    };

    switch (size) {
      case 'sm':
        base.paddingHorizontal = 14;
        base.minHeight = 44;
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
        base.borderColor = colors.borderHighlight;
        base.borderWidth = 1;
        break;
      case 'outline':
        base.backgroundColor = colors.surface;
        base.borderColor = colors.border;
        base.borderWidth = 1;
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
        base.shadowColor = colors.shadow;
        base.shadowOffset = { width: 0, height: 6 };
        base.shadowOpacity = 0.18;
        base.shadowRadius = 12;
        base.elevation = 3;
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
        return colors.onPrimary;
      case 'primary':
      default:
        return colors.onPrimary;
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
          opacity: pressed ? 0.9 : disabled ? 0.45 : 1,
          transform: [{ scale: pressed ? 0.985 : 1 }],
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
            fontWeight: '700',
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
