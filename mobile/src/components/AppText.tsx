import { Text, type TextProps, type TextStyle } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { typography } from '../ui/tokens';

export type TextVariant =
  | 'display'
  | 'largeHeading'
  | 'heading1'
  | 'heading2'
  | 'heading3'
  | 'title'
  | 'heading'
  | 'bodyLarge'
  | 'body'
  | 'bodyBold'
  | 'bodySmall'
  | 'caption'
  | 'label'
  | 'button'
  | 'numeric'
  | 'error';

export type SemanticTextColor =
  | 'default'
  | 'secondary'
  | 'muted'
  | 'primary'
  | 'onPrimary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info';

interface Props extends TextProps {
  variant?: TextVariant;
  tone?: SemanticTextColor;
}

export function AppText({ variant = 'body', tone, style, ...rest }: Props) {
  const { colors } = useTheme();

  const baseStyle: TextStyle =
    variant === 'error' ? typography.caption : typography[variant] ?? typography.body;

  let resolvedColor = colors.text;
  if (tone) {
    const toneMap: Record<SemanticTextColor, string> = {
      default: colors.text,
      secondary: colors.textSecondary,
      muted: colors.textMuted,
      primary: colors.primary,
      onPrimary: colors.onPrimary,
      success: colors.success,
      warning: colors.warning,
      danger: colors.danger,
      info: colors.info,
    };
    resolvedColor = toneMap[tone];
  } else if (variant === 'caption' || variant === 'bodySmall' || variant === 'label') {
    resolvedColor = colors.textMuted;
  } else if (variant === 'error') {
    resolvedColor = colors.danger;
  }

  return <Text style={[baseStyle, { color: resolvedColor }, style]} {...rest} />;
}
