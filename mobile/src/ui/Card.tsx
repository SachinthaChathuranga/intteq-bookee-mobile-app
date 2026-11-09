import { useRef, type ReactNode } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { lightImpact } from './haptics';
import { getShadow, radius, spacing } from './tokens';

export type CardVariant = 'elevated' | 'outlined' | 'subtle' | 'selected';

export interface CardProps {
  children: ReactNode;
  variant?: CardVariant;
  padding?: keyof typeof spacing | number;
  onPress?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Card({
  children,
  variant = 'elevated',
  padding = 'lg',
  onPress,
  disabled = false,
  style,
}: CardProps) {
  const { colors } = useTheme();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const padValue = typeof padding === 'number' ? padding : spacing[padding];

  const bgMap: Record<CardVariant, string> = {
    elevated: colors.card,
    outlined: colors.surface,
    subtle: colors.inputBackground,
    selected: colors.primaryLight,
  };

  const borderMap: Record<CardVariant, string> = {
    elevated: colors.border,
    outlined: colors.border,
    subtle: 'transparent',
    selected: colors.primary,
  };

  const cardStyle: StyleProp<ViewStyle> = [
    styles.base,
    {
      backgroundColor: bgMap[variant],
      borderColor: borderMap[variant],
      borderWidth: variant === 'subtle' ? 0 : variant === 'selected' ? 1.5 : 1,
      padding: padValue,
    },
    variant === 'elevated' ? getShadow(colors, 'sm') : undefined,
    disabled && { opacity: 0.55 },
    style,
  ];

  if (onPress) {
    return (
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <Pressable
          accessibilityRole="button"
          disabled={disabled}
          onPressIn={() => {
            if (disabled) return;
            Animated.spring(scaleAnim, {
              toValue: 0.985,
              useNativeDriver: true,
              speed: 50,
              bounciness: 3,
            }).start();
          }}
          onPressOut={() => {
            Animated.spring(scaleAnim, {
              toValue: 1,
              useNativeDriver: true,
              speed: 50,
              bounciness: 3,
            }).start();
          }}
          onPress={() => {
            if (disabled) return;
            lightImpact();
            onPress();
          }}
          style={cardStyle}
        >
          {children}
        </Pressable>
      </Animated.View>
    );
  }

  return <View style={cardStyle}>{children}</View>;
}

export function SurfaceCard(props: CardProps) {
  return <Card {...props} variant={props.variant ?? 'outlined'} />;
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.lg,
  },
});
