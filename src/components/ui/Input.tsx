import { forwardRef, ReactNode, useState } from 'react';
import {
  StyleProp,
  Text,
  TextInput,
  TextInputProps,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { useTheme } from '@/hooks/use-theme';

export type InputProps = TextInputProps & {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
};

const Input = forwardRef<TextInput, InputProps>(
  (
    {
      label,
      error,
      helperText,
      leftIcon,
      rightIcon,
      containerStyle,
      labelStyle,
      onFocus,
      onBlur,
      ...rest
    },
    ref,
  ) => {
    const colors = useTheme();
    const [isFocused, setIsFocused] = useState(false);

    return (
      <View style={[{ marginBottom: 16 }, containerStyle]}>
        {label && (
          <Text
            style={[
              {
                fontSize: 12,
                fontWeight: '700',
                color: colors.text,
                marginBottom: 8,
                letterSpacing: 0.4,
              },
              labelStyle,
            ]}>
            {label}
          </Text>
        )}

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: isFocused ? colors.surface : colors.surfaceInset,
            borderWidth: 1,
            borderColor: error
              ? colors.danger
              : isFocused
                ? colors.primary
                : colors.border,
            borderRadius: 16,
            paddingHorizontal: 16,
            minHeight: 52,
            shadowColor: isFocused ? colors.primary : 'transparent',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: isFocused ? 0.1 : 0,
            shadowRadius: 10,
          }}>
          {leftIcon && <View style={{ marginRight: 12 }}>{leftIcon}</View>}

          <TextInput
            placeholderTextColor={colors.textSecondary}
            ref={ref}
            style={{
              flex: 1,
              fontSize: 15,
              color: colors.text,
              paddingVertical: 12,
            }}
            onBlur={(e) => {
              setIsFocused(false);
              onBlur?.(e);
            }}
            onFocus={(e) => {
              setIsFocused(true);
              onFocus?.(e);
            }}
            {...rest}
          />

          {rightIcon && <View style={{ marginLeft: 12 }}>{rightIcon}</View>}
        </View>

        {error ? (
          <Text style={{ marginTop: 6, fontSize: 12, color: colors.danger, fontWeight: '500' }}>
            {error}
          </Text>
        ) : helperText ? (
          <Text style={{ marginTop: 6, fontSize: 12, color: colors.textSecondary }}>
            {helperText}
          </Text>
        ) : null}
      </View>
    );
  },
);

Input.displayName = 'Input';

export default Input;
