import { palette } from './palette';

export interface ColorTokens {
  primary: string;
  onPrimary: string;
  primaryLight: string;
  primaryBorder: string;
  background: string;
  surface: string;
  text: string;
  textMuted: string;
  border: string;
  success: string;
  warning: string;
  danger: string;
  overlay: string;
  star: string;
  shadow: string;
}

export const light: ColorTokens = {
  primary: palette.primary[600],
  onPrimary: palette.neutral[0],
  primaryLight: palette.primary[50],
  primaryBorder: palette.primary[200],
  background: palette.neutral[100],
  surface: palette.neutral[0],
  text: palette.neutral[900],
  textMuted: palette.neutral[500],
  border: palette.neutral[200],
  success: palette.success,
  warning: palette.warning,
  danger: palette.danger,
  overlay: palette.overlay,
  star: palette.primary[600],
  shadow: palette.neutral[900],
};

export const dark: ColorTokens = {
  primary: palette.primary[400],
  onPrimary: palette.neutral[950],
  primaryLight: palette.neutral[900],
  primaryBorder: palette.primary[800],
  background: palette.neutral[950],
  surface: palette.neutral[900],
  text: palette.neutral[50],
  textMuted: palette.neutral[400],
  border: palette.neutral[800],
  success: palette.success,
  warning: palette.warning,
  danger: palette.danger,
  overlay: palette.overlay,
  star: palette.primary[400],
  shadow: palette.neutral[950],
};


export const colors = { light, dark };
