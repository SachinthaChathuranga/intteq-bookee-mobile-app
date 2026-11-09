import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '../components/AppText';
import { useTheme } from '../theme/ThemeProvider';
import { lightImpact } from './haptics';
import { radius, spacing } from './tokens';

export interface OptionCardProps {
  icon?: ReactNode;
  leftElement?: ReactNode;
  rightElement?: ReactNode;
  title: string;
  subtitle?: string;
  selected?: boolean;
  onPress?: () => void;
  actionText?: string;
  onActionPress?: () => void;
}

export function OptionCard({
  icon,
  leftElement,
  rightElement,
  title,
  subtitle,
  selected = false,
  onPress,
  actionText,
  onActionPress,
}: OptionCardProps) {
  const { colors } = useTheme();
  const resolvedLeft = leftElement ?? icon;

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
      {resolvedLeft ? (
        <View style={styles.leftWrap}>{resolvedLeft}</View>
      ) : null}

      <View style={styles.textCol}>
        <AppText
          variant="bodyBold"
          style={{
            color: selected ? colors.primary : colors.text,
            fontSize: 15,
          }}
        >
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="caption" style={{ color: colors.textMuted }}>
            {subtitle}
          </AppText>
        ) : null}
      </View>

      {rightElement ? (
        rightElement
      ) : actionText ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            lightImpact();
            onActionPress?.();
          }}
          style={[styles.actionPill, { backgroundColor: colors.inputBackground }]}
        >
          <AppText variant="label" style={{ color: colors.text }}>
            {actionText}
          </AppText>
        </Pressable>
      ) : selected ? (
        <View style={[styles.checkCircle, { backgroundColor: colors.primary }]}>
          <Ionicons name="checkmark" size={14} color={colors.onPrimary} />
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.lg,
    gap: spacing.md,
  },
  leftWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCol: {
    flex: 1,
    gap: 2,
  },
  actionPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.full,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
