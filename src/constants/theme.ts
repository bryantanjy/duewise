/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    background: '#F7F7F5',
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#EFEDFF',
    border: '#E4E4DF',
    danger: '#D84A4A',
    dangerSoft: '#FFF0F0',
    onPrimary: '#FFFFFF',
    primary: '#635BFF',
    primarySoft: '#EFEDFF',
    success: '#3F7D55',
    successSoft: '#EDF7F0',
    surface: '#FFFFFF',
    surfaceInset: '#F1F1EE',
    text: '#171717',
    textSecondary: '#73736E',
    warning: '#B87518',
    warningSoft: '#FFF6E8',
  },
  dark: {
    background: '#111113',
    backgroundElement: '#1A1A1E',
    backgroundSelected: '#292548',
    border: '#2B2B31',
    danger: '#FF7A7A',
    dangerSoft: '#3A2024',
    onPrimary: '#FFFFFF',
    primary: '#8B84FF',
    primarySoft: '#292548',
    success: '#72B78A',
    successSoft: '#1D3325',
    surface: '#1A1A1E',
    surfaceInset: '#151518',
    text: '#F5F5F3',
    textSecondary: '#A3A3A0',
    warning: '#E6A650',
    warningSoft: '#382B18',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
