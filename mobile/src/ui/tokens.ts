import { Platform, type TextStyle, type ViewStyle } from 'react-native';
import type { ThemeColors } from '../theme/colors';

/**
 * Spacing scale (Phase 1.3): 4, 8, 12, 16, 20, 24, 32, 40, 48
 */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl_mid: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
  huge: 48,
} as const;

export const radius = {
  xs: 6,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  card: 16,
  pill: 9999,
  full: 9999,
} as const;

/**
 * Typography System (Phase 1.2)
 * Readable across English, Sinhala, and Tamil with balanced line heights.
 */
export const typography = {
  display: {
    fontSize: 34,
    lineHeight: 42,
    fontWeight: '800',
    letterSpacing: -0.6,
  } satisfies TextStyle,
  largeHeading: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: '800',
    letterSpacing: -0.5,
  } satisfies TextStyle,
  heading1: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: '700',
    letterSpacing: -0.4,
  } satisfies TextStyle,
  heading2: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '700',
    letterSpacing: -0.3,
  } satisfies TextStyle,
  heading3: {
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '600',
    letterSpacing: -0.2,
  } satisfies TextStyle,
  // Legacy aliases for backward compatibility
  title: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: '700',
    letterSpacing: -0.4,
  } satisfies TextStyle,
  heading: {
    fontSize: 18,
    lineHeight: 26,
    fontWeight: '600',
    letterSpacing: -0.2,
  } satisfies TextStyle,
  bodyLarge: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400',
  } satisfies TextStyle,
  body: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '400',
  } satisfies TextStyle,
  bodyBold: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
  } satisfies TextStyle,
  bodySmall: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '400',
  } satisfies TextStyle,
  caption: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400',
  } satisfies TextStyle,
  label: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
    letterSpacing: 0.4,
  } satisfies TextStyle,
  button: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
    letterSpacing: 0.1,
  } satisfies TextStyle,
  numeric: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.3,
  } satisfies TextStyle,
} as const;

export function getShadow(colors: ThemeColors, level: 'sm' | 'md' | 'lg' = 'sm'): ViewStyle {
  if (Platform.OS === 'android') {
    const elevationMap = { sm: 2, md: 4, lg: 8 };
    return { elevation: elevationMap[level] };
  }

  const iosConfig = {
    sm: { shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
    md: { shadowOpacity: 0.08, shadowRadius: 14, shadowOffset: { width: 0, height: 4 } },
    lg: { shadowOpacity: 0.14, shadowRadius: 24, shadowOffset: { width: 0, height: 8 } },
  }[level];

  return {
    shadowColor: colors.shadow,
    ...iosConfig,
  };
}
