/**
 * Raw colour palette — SINGLE SOURCE OF RAW COLOURS.
 * Do not import this file outside `src/theme/colors.ts`.
 * Components must always read semantic tokens from `useTheme().colors`.
 */
export const palette = {
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',

  // Brand Primary — Sophisticated Royal Blue
  blue50: '#EFF6FF',
  blue100: '#DBEAFE',
  blue200: '#BFDBFE',
  blue300: '#93C5FD',
  blue400: '#60A5FA',
  blue500: '#3B82F6',
  blue600: '#2563EB',
  blue700: '#1D4ED8',
  blue800: '#1E40AF',
  blue900: '#1E3A8A',
  blue950: '#172554',

  // Secondary / Indigo Accent
  indigo50: '#EEF2FF',
  indigo100: '#E0E7FF',
  indigo400: '#818CF8',
  indigo500: '#6366F1',
  indigo600: '#4F46E5',
  indigo900: '#312E81',

  // Neutral Slate Scale (Light & Dark UI surfaces, borders, text)
  slate50: '#F8FAFC',
  slate100: '#F1F5F9',
  slate200: '#E2E8F0',
  slate300: '#CBD5E1',
  slate400: '#94A3B8',
  slate500: '#64748B',
  slate600: '#475569',
  slate700: '#334155',
  slate800: '#1E293B',
  slate850: '#162032',
  slate900: '#0F172A',
  slate950: '#090E1A',

  // Semantic — Emerald (Success)
  emerald50: '#ECFDF5',
  emerald100: '#D1FAE5',
  emerald400: '#34D399',
  emerald500: '#10B981',
  emerald600: '#059669',
  emerald700: '#047857',
  emerald900: '#064E3B',
  emerald950: '#022C22',

  // Semantic — Amber (Warning / Ratings)
  amber50: '#FFFBEB',
  amber100: '#FEF3C7',
  amber400: '#FBBF24',
  amber500: '#F59E0B',
  amber600: '#D97706',
  amber700: '#B45309',
  amber900: '#78350F',
  amber950: '#451A03',

  // Semantic — Rose / Red (Error / Destructive)
  red50: '#FEF2F2',
  red100: '#FEE2E2',
  red400: '#F87171',
  red500: '#EF4444',
  red600: '#DC2626',
  red700: '#B91C1C',
  red900: '#7F1D1D',
  red950: '#450A0A',

  // Semantic — Sky (Info)
  sky50: '#F0F9FF',
  sky100: '#E0F2FE',
  sky400: '#38BDF8',
  sky500: '#0EA5E9',
  sky600: '#0284C7',
  sky900: '#0C4A6E',
  sky950: '#082F49',

  // Overlays & Alpha Tints
  overlayLight: 'rgba(15, 23, 42, 0.45)',
  overlayDark: 'rgba(2, 6, 23, 0.72)',
  blueAlpha10: 'rgba(37, 99, 235, 0.10)',
  blueAlpha15: 'rgba(59, 130, 246, 0.16)',
  blueAlpha25: 'rgba(59, 130, 246, 0.28)',
  emeraldAlpha15: 'rgba(16, 185, 129, 0.16)',
  amberAlpha15: 'rgba(245, 158, 11, 0.16)',
  redAlpha15: 'rgba(239, 68, 68, 0.16)',
  skyAlpha15: 'rgba(14, 165, 233, 0.16)',
} as const;
