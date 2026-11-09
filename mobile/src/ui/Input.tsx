import { Ionicons } from '@expo/vector-icons';
import { forwardRef, useState, type ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { AppText } from '../components/AppText';
import { useTheme } from '../theme/ThemeProvider';
import { radius, spacing, typography } from './tokens';

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string | null;
  helperText?: string;
  leftIcon?: ReactNode | keyof typeof Ionicons.glyphMap;
  rightIcon?: ReactNode | keyof typeof Ionicons.glyphMap;
  onClear?: () => void;
  containerStyle?: StyleProp<ViewStyle>;
}

export const Input = forwardRef<TextInput, InputProps>(function Input(
  { label, error, helperText, leftIcon, rightIcon, onClear, containerStyle, style, onFocus, onBlur, value, ...rest },
  ref,
) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);

  const borderColor = error
    ? colors.danger
    : focused
      ? colors.primary
      : colors.border;

  const backgroundColor = focused ? colors.surface : colors.inputBackground;

  const renderIcon = (icon: ReactNode | keyof typeof Ionicons.glyphMap | undefined) => {
    if (!icon) return null;
    if (typeof icon === 'string') {
      return (
        <Ionicons
          name={icon as keyof typeof Ionicons.glyphMap}
          size={18}
          color={focused ? colors.primary : colors.textMuted}
        />
      );
    }
    return icon;
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? (
        <AppText variant="label" style={[styles.label, { color: colors.textSecondary }]}>
          {label}
        </AppText>
      ) : null}
      <View
        style={[
          styles.inputWrapper,
          {
            backgroundColor,
            borderColor,
            borderWidth: focused || error ? 1.5 : 1,
          },
        ]}
      >
        {leftIcon ? <View style={styles.iconLeft}>{renderIcon(leftIcon)}</View> : null}
        <TextInput
          ref={ref as any}
          value={value}
          placeholderTextColor={colors.placeholder}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={[
            styles.input,
            {
              color: colors.text,
            },
            style,
          ]}
          {...rest}
        />
        {onClear && value && String(value).length > 0 ? (
          <Pressable
            onPress={onClear}
            hitSlop={10}
            style={styles.iconRight}
            accessibilityRole="button"
            accessibilityLabel="Clear input"
          >
            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
          </Pressable>
        ) : rightIcon ? (
          <View style={styles.iconRight}>{renderIcon(rightIcon)}</View>
        ) : null}
      </View>
      {error ? (
        <View style={styles.feedbackRow}>
          <Ionicons name="alert-circle" size={14} color={colors.danger} />
          <AppText variant="error" style={styles.error}>
            {error}
          </AppText>
        </View>
      ) : helperText ? (
        <AppText variant="caption" style={{ color: colors.textMuted }}>
          {helperText}
        </AppText>
      ) : null}
    </View>
  );
});

export const InputField = Input;

export interface SearchInputProps extends Omit<InputProps, 'leftIcon'> {
  onClear?: () => void;
}

export function SearchInput({ value, onClear, ...rest }: SearchInputProps) {
  const { colors } = useTheme();
  return (
    <Input
      value={value}
      leftIcon={<Ionicons name="search-outline" size={19} color={colors.textMuted} />}
      onClear={onClear}
      returnKeyType="search"
      autoCapitalize="none"
      autoCorrect={false}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs + 2,
  },
  label: {
    marginLeft: 2,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 50,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
  },
  iconLeft: {
    marginRight: spacing.sm,
  },
  iconRight: {
    marginLeft: spacing.sm,
  },
  input: {
    flex: 1,
    ...typography.body,
    paddingVertical: spacing.sm + 2,
  },
  feedbackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  error: {
    flex: 1,
  },
});
