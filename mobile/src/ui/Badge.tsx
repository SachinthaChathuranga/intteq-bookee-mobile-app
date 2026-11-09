import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { AppText } from '../components/AppText';
import { useTheme } from '../theme/ThemeProvider';
import { radius, spacing } from './tokens';

export type BadgeTone = 'primary' | 'neutral' | 'success' | 'warning' | 'danger' | 'info';

export interface BadgeProps {
  label: string;
  tone?: BadgeTone;
  variant?: BadgeTone;
  size?: 'sm' | 'md';
  dot?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  style?: StyleProp<ViewStyle>;
}

export function Badge({
  label,
  tone,
  variant,
  size = 'md',
  dot = false,
  icon,
  style,
}: BadgeProps) {
  const { colors } = useTheme();
  const resolvedTone: BadgeTone = tone ?? variant ?? 'primary';

  const bgMap: Record<BadgeTone, string> = {
    primary: colors.primaryLight,
    neutral: colors.inputBackground,
    success: colors.successLight,
    warning: colors.warningLight,
    danger: colors.dangerLight,
    info: colors.infoLight,
  };

  const fgMap: Record<BadgeTone, string> = {
    primary: colors.primary,
    neutral: colors.textSecondary,
    success: colors.success,
    warning: colors.warning,
    danger: colors.danger,
    info: colors.info,
  };

  const fg = fgMap[resolvedTone];

  return (
    <View
      style={[
        styles.badge,
        size === 'sm' ? styles.sm : styles.md,
        { backgroundColor: bgMap[resolvedTone] },
        style,
      ]}
    >
      {dot ? <View style={[styles.dot, { backgroundColor: fg }]} /> : null}
      {icon ? <Ionicons name={icon} size={size === 'sm' ? 11 : 13} color={fg} /> : null}
      <AppText
        variant="label"
        style={[
          styles.text,
          size === 'sm' && { fontSize: 11, lineHeight: 14 },
          { color: fg },
        ]}
      >
        {label}
      </AppText>
    </View>
  );
}

export function StatusBadge(props: BadgeProps) {
  return <Badge {...props} dot={props.dot ?? true} />;
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: radius.full,
    gap: 5,
  },
  sm: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  md: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  text: {
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
