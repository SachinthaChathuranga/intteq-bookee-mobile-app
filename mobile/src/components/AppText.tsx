import { Text, type TextProps } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import type { ColorTokens } from '../theme/colors';

type Variant = 'title' | 'heading' | 'body' | 'bodyBold' | 'caption' | 'error';

const variantStyle = {
  title: { fontSize: 28, fontWeight: '700', lineHeight: 40 },
  heading: { fontSize: 20, fontWeight: '700', lineHeight: 28 },
  body: { fontSize: 16, lineHeight: 26 },
  bodyBold: { fontSize: 16, fontWeight: '600', lineHeight: 26 },
  caption: { fontSize: 14, lineHeight: 22 },
  error: { fontSize: 14, lineHeight: 22 },
} as const;

const variantColor: Record<Variant, keyof ColorTokens> = {
  title: 'text',
  heading: 'text',
  body: 'text',
  bodyBold: 'text',
  caption: 'textMuted',
  error: 'danger',
};


// Generous line heights so Sinhala/Tamil glyphs are not clipped.
export function AppText({ variant = 'body', style, ...rest }: TextProps & { variant?: Variant }) {
  const { colors } = useTheme();
  return <Text {...rest} style={[variantStyle[variant], { color: colors[variantColor[variant]] }, style]} />;
}
