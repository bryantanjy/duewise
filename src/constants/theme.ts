/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

/** Reference palette: blue porcelain, vivid indigo, lilac and blue ink. */
export const Colors = {
  light: {
    background: '#F3F5FC',
    homeBackground: '#F3F5FC',
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#E7E7FF',
    border: '#DCE2F0',
    borderHighlight: 'rgba(68, 69, 187, 0.45)',
    danger: '#A12D46',
    dangerSoft: '#F9E5E7',
    shadow: '#302B50',
    onPrimary: '#FFFFFF',
    onDanger: '#FFFFFF',
    primary: '#4445BB',
    primaryFill: '#4445BB',
    primarySoft: '#E7E7FF',
    success: '#276C51',
    successSoft: '#E2EEE5',
    surface: '#FFFFFF',
    surfaceRaised: '#FFFFFF',
    surfaceInset: '#EBEFF8',
    text: '#182C49',
    textSecondary: '#55647E',
    warning: '#855717',
    warningSoft: '#F6EAD2',
    hero: '#41469C',
    heroText: '#FFFFFF',
    heroMuted: '#DFE3FF',
    heroAccent: '#D0CFFF',
    heroBorder: '#5F65B5',
    summarySurface: '#EAEFFC',
    summaryBorder: '#D7DFF2',
    dateTile: '#E7E7FF',
  },
  dark: {
    background: '#10151D',
    homeBackground: '#10151D',
    backgroundElement: '#1A212D',
    backgroundSelected: '#2C3051',
    border: '#354054',
    borderHighlight: 'rgba(172, 166, 255, 0.65)',
    danger: '#FFA7B6',
    dangerSoft: '#57354F',
    shadow: '#0B1018',
    onPrimary: '#FFFFFF',
    onDanger: '#10151D',
    primary: '#ACA6FF',
    primaryFill: '#625DDA',
    primarySoft: '#2C3051',
    success: '#A2DEC2',
    successSoft: '#304E50',
    surface: '#1A212D',
    surfaceRaised: '#242D3C',
    surfaceInset: '#141B26',
    text: '#F1F4FF',
    textSecondary: '#AAB7CE',
    warning: '#F0C78C',
    warningSoft: '#574637',
    hero: '#30376E',
    heroText: '#FFFFFF',
    heroMuted: '#CFD6F4',
    heroAccent: '#C4BDFF',
    heroBorder: '#525C96',
    summarySurface: '#1A212D',
    summaryBorder: '#354054',
    dateTile: '#2C3051',
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
