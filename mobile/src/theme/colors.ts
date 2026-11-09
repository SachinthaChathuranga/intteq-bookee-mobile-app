import { palette } from './palette';

export interface ThemeColors {
  // Brand & Accents
  primary: string;
  onPrimary: string;
  primaryLight: string;
  primaryBorder: string;
  secondary: string;
  secondaryLight: string;

  // Surfaces & Backgrounds
  background: string;
  surface: string;
  elevatedSurface: string;
  card: string;
  inputBackground: string;
  tabBar: string;
  navigationBackground: string;

  // Typography
  text: string;
  textSecondary: string;
  textMuted: string;
  placeholder: string;

  // Borders & Dividers
  border: string;
  divider: string;

  // Semantic Statuses
  success: string;
  successLight: string;
  warning: string;
  warningLight: string;
  danger: string;
  dangerLight: string;
  info: string;
  infoLight: string;

  // Utility
  disabled: string;
  overlay: string;
  star: string;
  shadow: string;
}

export const lightColors: ThemeColors = {
  primary: palette.blue600,
  onPrimary: palette.white,
  primaryLight: palette.blue50,
  primaryBorder: palette.blue200,
  secondary: palette.indigo600,
  secondaryLight: palette.indigo50,

  background: palette.slate50,
  surface: palette.white,
  elevatedSurface: palette.white,
  card: palette.white,
  inputBackground: palette.slate100,
  tabBar: palette.white,
  navigationBackground: palette.white,

  text: palette.slate900,
  textSecondary: palette.slate600,
  textMuted: palette.slate500,
  placeholder: palette.slate400,

  border: palette.slate200,
  divider: palette.slate100,

  success: palette.emerald600,
  successLight: palette.emerald50,
  warning: palette.amber600,
  warningLight: palette.amber50,
  danger: palette.red600,
  dangerLight: palette.red50,
  info: palette.sky600,
  infoLight: palette.sky50,

  disabled: palette.slate200,
  overlay: palette.overlayLight,
  star: palette.amber500,
  shadow: palette.slate900,
};

export const darkColors: ThemeColors = {
  primary: palette.blue500,
  onPrimary: palette.white,
  primaryLight: palette.blueAlpha15,
  primaryBorder: palette.blue800,
  secondary: palette.indigo400,
  secondaryLight: palette.indigo900,

  background: palette.slate950,
  surface: palette.slate900,
  elevatedSurface: palette.slate800,
  card: palette.slate900,
  inputBackground: palette.slate850,
  tabBar: palette.slate900,
  navigationBackground: palette.slate900,

  text: palette.slate50,
  textSecondary: palette.slate300,
  textMuted: palette.slate400,
  placeholder: palette.slate500,

  border: palette.slate800,
  divider: palette.slate850,

  success: palette.emerald400,
  successLight: palette.emeraldAlpha15,
  warning: palette.amber400,
  warningLight: palette.amberAlpha15,
  danger: palette.red400,
  dangerLight: palette.redAlpha15,
  info: palette.sky400,
  infoLight: palette.skyAlpha15,

  disabled: palette.slate800,
  overlay: palette.overlayDark,
  star: palette.amber400,
  shadow: palette.black,
};
