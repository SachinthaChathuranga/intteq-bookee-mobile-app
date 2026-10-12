export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 8,
  input: 12,
  card: 16,
  pill: 9999,
  full: 9999,
} as const;


export const typography = {
  title: {
    fontSize: 28,
    lineHeight: 38,
    fontWeight: '700' as const,
  },
  heading: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '700' as const,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400' as const,
  },
  bodyBold: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600' as const,
  },
  caption: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500' as const,
  },
} as const;

export type SpacingKey = keyof typeof spacing;
export type TypographyVariant = keyof typeof typography;
