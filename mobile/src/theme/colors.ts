import { palette } from './palette';

export interface ColorTokens {
  primary: string;
  onPrimary: string;
  background: string;
  surface: string;
  text: string;
  textMuted: string;
  border: string;
  success: string;
  warning: string;
  danger: string;
  overlay: string;
}

export const light: ColorTokens = {
  primary: palette.primary[600],
  onPrimary: palette.neutral[0],
  background: palette.neutral[50],
  surface: palette.neutral[0],
  text: palette.neutral[900],
  textMuted: palette.neutral[500],
  border: palette.neutral[200],
  success: palette.success,
  warning: palette.warning,
  danger: palette.danger,
  overlay: palette.overlay,
};

export const dark: ColorTokens = {
  primary: palette.primary[400],
  onPrimary: palette.neutral[950],
  background: palette.neutral[950],
  surface: palette.neutral[900],
  text: palette.neutral[50],
  textMuted: palette.neutral[400],
  border: palette.neutral[800],
  success: palette.success,
  warning: palette.warning,
  danger: palette.danger,
  overlay: palette.overlay,
};

export const colors = { light, dark };
