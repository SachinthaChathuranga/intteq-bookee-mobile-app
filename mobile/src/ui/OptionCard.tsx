import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { lightImpact } from './haptics';
import { radius, spacing, typography } from './tokens';

interface Props {
  icon?: ReactNode;
  title: string;
  subtitle?: string;
  selected?: boolean;
  onPress?: () => void;
  actionText?: string;
  onActionPress?: () => void;
}

export function OptionCard({
  icon,
  title,
  subtitle,
  selected = false,
  onPress,
  actionText,
  onActionPress,
}: Props) {
  const { colors } = useTheme();

  const handlePress = () => {
    if (onPress) {
      lightImpact();
      onPress();
    }
  };

  return (
    <Pressable
      accessibilityRole="button"
      onPress={handlePress}
      style={({ pressed }) => [
        styles.container,
        {
          backgroundColor: selected ? colors.primaryLight : colors.surface,
          borderColor: selected ? colors.primary : colors.border,
          borderWidth: selected ? 1.5 : 1,
          opacity: pressed ? 0.88 : 1,
        },
      ]}
    >
      {icon ? (
        <View
          style={[
            styles.iconWrapper,
            {
              backgroundColor: selected ? colors.primary : colors.background,
            },
          ]}
        >
          {icon}
        </View>
      ) : null}

      <View style={styles.textCol}>
        <Text
          style={[
            typography.bodyBold,
            {
              color: selected ? colors.primary : colors.text,
              fontSize: 16,
            },
          ]}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text style={[typography.caption, { color: colors.textMuted }]}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      {actionText ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            lightImpact();
            onActionPress?.();
          }}
          style={[styles.actionPill, { backgroundColor: colors.border }]}
        >
          <Text style={[typography.caption, { color: colors.text, fontWeight: '700' }]}>
            {actionText}
          </Text>
        </Pressable>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.card,
    gap: spacing.md,
    marginVertical: spacing.xs,
  },
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCol: {
    flex: 1,
    gap: 2,
  },
  actionPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
});
