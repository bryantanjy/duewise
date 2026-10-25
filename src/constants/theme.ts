/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    background: '#F5F3F8',
    homeBackground: '#F8F7F4',
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#EEEAFB',
    border: '#E3DEE9',
    borderHighlight: 'rgba(102, 86, 217, 0.24)',
    danger: '#BD3153',
    dangerSoft: '#FCE8ED',
    shadow: '#241B3A',
    onPrimary: '#FFFFFF',
    primary: '#6656D9',
    primaryFill: '#5A49CF',
    primarySoft: '#EEEAFB',
    success: '#147D5A',
    successSoft: '#E2F3EB',
    surface: '#FFFFFF',
    surfaceInset: '#F0EDF5',
    text: '#18151F',
    textSecondary: '#696575',
    warning: '#986216',
    warningSoft: '#FBF0DA',
    hero: '#201936',
    heroMuted: '#C9C2D8',
    heroAccent: '#F0CD91',
    heroBorder: '#3B3157',
  },
  dark: {
    background: '#0B0A0F',
    homeBackground: '#0F0E13',
    backgroundElement: '#15131B',
    backgroundSelected: '#28223F',
    border: '#2D2938',
    borderHighlight: 'rgba(179, 166, 255, 0.3)',
    danger: '#FF8197',
    dangerSoft: '#351B24',
    shadow: '#000000',
    onPrimary: '#FFFFFF',
    primary: '#B3A6FF',
    primaryFill: '#7665E7',
    primarySoft: '#28223F',
    success: '#55D6A2',
    successSoft: '#153226',
    surface: '#15131B',
    surfaceInset: '#1D1A25',
    text: '#F7F4FB',
    textSecondary: '#AAA4B5',
    warning: '#F2BF64',
    warningSoft: '#332817',
    hero: '#1C1730',
    heroMuted: '#C5BED3',
    heroAccent: '#F0CD91',
    heroBorder: '#403558',
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
