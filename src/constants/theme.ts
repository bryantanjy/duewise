/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    background: '#F7F5F1',
    backgroundElement: '#FFFEFC',
    backgroundSelected: '#EEEAFB',
    border: '#E9E4E5',
    danger: '#B4484F',
    dangerSoft: '#FBEDEF',
    onPrimary: '#FFFFFF',
    primary: '#5B50C5',
    primaryFill: '#5B50C5',
    primarySoft: '#EEEAFB',
    success: '#397B65',
    successSoft: '#EAF5EF',
    surface: '#FFFEFC',
    surfaceInset: '#F1EEF1',
    text: '#242132',
    textSecondary: '#6F6B77',
    warning: '#99651E',
    warningSoft: '#FCF3E5',
    hero: '#282638',
    heroMuted: '#C5C0D3',
    heroAccent: '#C6BEFF',
  },
  dark: {
    background: '#101018',
    backgroundElement: '#1B1B27',
    backgroundSelected: '#2C2949',
    border: '#333241',
    danger: '#FF979F',
    dangerSoft: '#422831',
    onPrimary: '#FFFFFF',
    primary: '#B5ADFF',
    primaryFill: '#6356C8',
    primarySoft: '#2C2949',
    success: '#8FD5B3',
    successSoft: '#203D35',
    surface: '#1B1B27',
    surfaceInset: '#232331',
    text: '#F6F3F8',
    textSecondary: '#A9A5B5',
    warning: '#EAC382',
    warningSoft: '#3B3025',
    hero: '#282638',
    heroMuted: '#C5C0D3',
    heroAccent: '#C6BEFF',
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
