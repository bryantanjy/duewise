/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    background: '#F7F8FA',
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#EEECFF',
    border: '#E8EAED',
    borderHighlight: 'rgba(93, 80, 230, 0.2)',
    danger: '#E11D48',
    dangerSoft: '#FFE4E6',
    onPrimary: '#FFFFFF',
    primary: '#5D50E6',
    primaryFill: '#5D50E6',
    primarySoft: '#EEECFF',
    success: '#059669',
    successSoft: '#D1FAE5',
    surface: '#FFFFFF',
    surfaceInset: '#F1F3F6',
    text: '#191724',
    textSecondary: '#6E6A86',
    warning: '#D97706',
    warningSoft: '#FEF3C7',
    hero: '#18162B',
    heroMuted: '#B8B3CE',
    heroAccent: '#C7BEFF',
  },
  dark: {
    background: '#0C0C14',
    backgroundElement: '#161622',
    backgroundSelected: '#27244D',
    border: '#262638',
    borderHighlight: 'rgba(139, 127, 255, 0.25)',
    danger: '#FB7185',
    dangerSoft: '#381C26',
    onPrimary: '#FFFFFF',
    primary: '#8B7FFF',
    primaryFill: '#6355EE',
    primarySoft: '#25224A',
    success: '#34D399',
    successSoft: '#133529',
    surface: '#161622',
    surfaceInset: '#1E1E2E',
    text: '#F5F5F9',
    textSecondary: '#9A96B2',
    warning: '#FBBF24',
    warningSoft: '#382D16',
    hero: '#1C1934',
    heroMuted: '#B0AAC9',
    heroAccent: '#C7BEFF',
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
