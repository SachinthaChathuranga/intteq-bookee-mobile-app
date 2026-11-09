import { Ionicons } from '@expo/vector-icons';
import { useRef, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { AppText } from '../components/AppText';
import { useTheme } from '../theme/ThemeProvider';
import { lightImpact } from './haptics';
import { getShadow, radius, spacing } from './tokens';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'subtle';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  leftIcon?: ReactNode | keyof typeof Ionicons.glyphMap;
  rightIcon?: ReactNode | keyof typeof Ionicons.glyphMap;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  leftIcon,
  rightIcon,
  fullWidth = true,
  style,
}: ButtonProps) {
  const { colors } = useTheme();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const isDisabled = disabled || loading;

  const handlePressIn = () => {
    if (isDisabled) return;
    Animated.spring(scaleAnim, {
      toValue: 0.975,
      useNativeDriver: true,
      speed: 40,
      bounciness: 4,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 40,
      bounciness: 4,
    }).start();
  };

  const handlePress = () => {
    if (isDisabled) return;
    lightImpact();
    onPress();
  };

  const bgMap: Record<ButtonVariant, string> = {
    primary: colors.primary,
    secondary: colors.surface,
    ghost: 'transparent',
    danger: colors.danger,
    subtle: colors.primaryLight,
  };

  const textMap: Record<ButtonVariant, string> = {
    primary: colors.onPrimary,
    secondary: colors.text,
    ghost: colors.primary,
    danger: colors.onPrimary,
    subtle: colors.primary,
  };

  const borderMap: Record<ButtonVariant, string> = {
    primary: colors.primary,
    secondary: colors.border,
    ghost: 'transparent',
    danger: colors.danger,
    subtle: colors.primaryBorder,
  };

  const sizeStyles: Record<ButtonSize, ViewStyle> = {
    sm: { minHeight: 38, paddingVertical: spacing.xs + 2, paddingHorizontal: spacing.md, borderRadius: radius.sm },
    md: { minHeight: 48, paddingVertical: spacing.md, paddingHorizontal: spacing.lg, borderRadius: radius.md },
    lg: { minHeight: 54, paddingVertical: spacing.md + 2, paddingHorizontal: spacing.xl, borderRadius: radius.lg },
  };

  const iconSize = size === 'sm' ? 16 : size === 'lg' ? 20 : 18;
  const textColor = textMap[variant];

  const renderIcon = (icon: ReactNode | keyof typeof Ionicons.glyphMap | undefined) => {
    if (!icon) return null;
    if (typeof icon === 'string') {
      return <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={iconSize} color={textColor} />;
    }
    return icon;
  };

  return (
    <Animated.View style={[fullWidth && styles.fullWidth, { transform: [{ scale: scaleAnim }] }, style]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled: isDisabled, busy: loading }}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={isDisabled}
        style={[
          styles.base,
          sizeStyles[size],
          fullWidth && styles.fullWidth,
          {
            backgroundColor: bgMap[variant],
            borderColor: borderMap[variant],
            borderWidth: variant === 'secondary' || variant === 'subtle' ? 1 : 0,
            opacity: isDisabled ? 0.5 : 1,
          },
          variant === 'primary' && !isDisabled ? getShadow(colors, 'sm') : undefined,
        ]}
      >
        {loading ? (
          <ActivityIndicator color={textColor} size="small" />
        ) : (
          <View style={styles.content}>
            {leftIcon ? <View style={styles.iconSlot}>{renderIcon(leftIcon)}</View> : null}
            <AppText
              variant="button"
              style={[
                { color: textColor },
                size === 'sm' && { fontSize: 13, lineHeight: 18 },
                size === 'lg' && { fontSize: 16, lineHeight: 22 },
              ]}
              numberOfLines={1}
            >
              {label}
            </AppText>
            {rightIcon ? <View style={styles.iconSlot}>{renderIcon(rightIcon)}</View> : null}
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

export function PrimaryButton(props: Omit<ButtonProps, 'variant'>) {
  return <Button {...props} variant="primary" />;
}

export function SecondaryButton(props: Omit<ButtonProps, 'variant'>) {
  return <Button {...props} variant="secondary" />;
}

export function TextButton(props: Omit<ButtonProps, 'variant'>) {
  return <Button {...props} variant="ghost" fullWidth={props.fullWidth ?? false} />;
}

export interface IconButtonProps {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'surface' | 'subtle' | 'primary' | 'ghost' | 'danger';
  disabled?: boolean;
  accessibilityLabel?: string;
  badgeCount?: number;
  style?: StyleProp<ViewStyle>;
}

export function IconButton({
  icon,
  onPress,
  size = 'md',
  variant = 'surface',
  disabled = false,
  accessibilityLabel,
  badgeCount,
  style,
}: IconButtonProps) {
  const { colors } = useTheme();
  const dim = size === 'sm' ? 34 : size === 'lg' ? 48 : 40;
  const iconSize = size === 'sm' ? 17 : size === 'lg' ? 22 : 20;

  const bgMap = {
    surface: colors.surface,
    subtle: colors.inputBackground,
    primary: colors.primary,
    ghost: 'transparent',
    danger: colors.dangerLight,
  };

  const iconColorMap = {
    surface: colors.text,
    subtle: colors.textSecondary,
    primary: colors.onPrimary,
    ghost: colors.text,
    danger: colors.danger,
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? icon}
      disabled={disabled}
      onPress={() => {
        if (disabled) return;
        lightImpact();
        onPress();
      }}
      style={({ pressed }) => [
        styles.iconButton,
        {
          width: dim,
          height: dim,
          borderRadius: dim / 2,
          backgroundColor: bgMap[variant],
          borderColor: variant === 'surface' ? colors.border : 'transparent',
          borderWidth: variant === 'surface' ? 1 : 0,
          opacity: disabled ? 0.45 : pressed ? 0.8 : 1,
        },
        style,
      ]}
    >
      <Ionicons name={icon} size={iconSize} color={iconColorMap[variant]} />
      {badgeCount && badgeCount > 0 ? (
        <View style={[styles.badgeDot, { backgroundColor: colors.danger, borderColor: colors.surface }]}>
          <AppText variant="label" style={{ color: colors.onPrimary, fontSize: 10, lineHeight: 12 }}>
            {badgeCount > 9 ? '9+' : badgeCount}
          </AppText>
        </View>
      ) : null}
    </Pressable>
  );
}

export interface FloatingActionButtonProps {
  icon?: keyof typeof Ionicons.glyphMap;
  label?: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}

export function FloatingActionButton({
  icon = 'add',
  label,
  onPress,
  style,
}: FloatingActionButtonProps) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label ?? icon}
      onPress={() => {
        lightImpact();
        onPress();
      }}
      style={({ pressed }) => [
        styles.fab,
        getShadow(colors, 'lg'),
        {
          backgroundColor: colors.primary,
          paddingHorizontal: label ? spacing.lg : 0,
          width: label ? undefined : 56,
          transform: [{ scale: pressed ? 0.96 : 1 }],
        },
        style,
      ]}
    >
      <Ionicons name={icon} size={24} color={colors.onPrimary} />
      {label ? (
        <AppText variant="button" style={{ color: colors.onPrimary }}>
          {label}
        </AppText>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  fullWidth: {
    width: '100%',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  iconSlot: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  fab: {
    position: 'absolute',
    bottom: spacing.xl,
    right: spacing.lg,
    height: 56,
    borderRadius: radius.full,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    zIndex: 20,
  },
});
