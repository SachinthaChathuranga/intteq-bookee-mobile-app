import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  ViewStyle,
} from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { lightImpact } from './haptics';
import { radius, spacing, typography } from './tokens';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'small' | 'medium';

interface Props {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  icon?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'medium',
  loading = false,
  disabled = false,
  icon,
  style,
}: Props) {
  const { colors } = useTheme();
  const inactive = disabled || loading;

  const handlePress = () => {
    if (!inactive) {
      lightImpact();
      onPress();
    }
  };

  const getBackgroundColor = (pressed: boolean) => {
    if (variant === 'primary') return colors.primary;
    if (variant === 'danger') return colors.danger;
    if (variant === 'secondary') return colors.surface;
    return 'transparent';
  };

  const getBorderColor = () => {
    if (variant === 'primary') return colors.primary;
    if (variant === 'danger') return colors.danger;
    if (variant === 'secondary') return colors.border;
    return 'transparent';
  };

  const getTextColor = () => {
    if (variant === 'primary' || variant === 'danger') return colors.onPrimary;
    if (variant === 'secondary') return colors.text;
    return colors.primary;
  };

  const isSmall = size === 'small';

  return (
    <Pressable
      accessibilityRole="button"
      onPress={handlePress}
      disabled={inactive}
      style={({ pressed }) => [
        styles.button,
        isSmall && styles.buttonSmall,
        {
          backgroundColor: getBackgroundColor(pressed),
          borderColor: getBorderColor(),
          opacity: inactive ? 0.5 : pressed ? 0.85 : 1,
          transform: [{ scale: pressed && !inactive ? 0.98 : 1 }],
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={getTextColor()} />
      ) : (
        <>
          {icon ? <>{icon}</> : null}
          <Text
            style={[
              isSmall ? typography.caption : typography.bodyBold,
              {
                color: getTextColor(),
                textAlign: 'center',
                fontWeight: '700',
              },
            ]}
          >
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 52,
    minHeight: 52,
    borderRadius: radius.input,
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  buttonSmall: {
    height: 38,
    minHeight: 38,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
  },
});

