import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { radius, spacing, typography } from './tokens';

export type BadgeVariant = 'primary' | 'success' | 'warning' | 'danger' | 'neutral';

interface Props {
  label: string;
  variant?: BadgeVariant;
  style?: StyleProp<ViewStyle>;
}

export function Badge({ label, variant = 'primary', style }: Props) {
  const { colors } = useTheme();

  const getColor = () => {
    switch (variant) {
      case 'success':
        return colors.success;
      case 'warning':
        return colors.warning;
      case 'danger':
        return colors.danger;
      case 'neutral':
        return colors.textMuted;
      case 'primary':
      default:
        return colors.primary;
    }
  };

  const activeColor = getColor();

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: colors.background,
          borderColor: activeColor,
        },
        style,
      ]}
    >
      <Text style={[typography.caption, { color: activeColor, fontWeight: '700', fontSize: 12 }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
});
