import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { AppText } from '../components/AppText';
import { useTheme } from '../theme/ThemeProvider';
import { Button } from './Button';
import { radius, spacing } from './tokens';

export interface EmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap | ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onActionPress?: () => void;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function EmptyState({
  icon = 'sparkles-outline',
  title,
  description,
  actionLabel,
  onActionPress,
  compact = false,
  style,
}: EmptyStateProps) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.container,
        compact && styles.compactContainer,
        { backgroundColor: colors.surface, borderColor: colors.border },
        style,
      ]}
    >
      <View
        style={[
          styles.iconCircle,
          compact && styles.compactIconCircle,
          { backgroundColor: colors.primaryLight },
        ]}
      >
        {typeof icon === 'string' ? (
          <Ionicons
            name={icon as keyof typeof Ionicons.glyphMap}
            size={compact ? 22 : 28}
            color={colors.primary}
          />
        ) : (
          icon
        )}
      </View>
      <View style={styles.textGroup}>
        <AppText variant={compact ? 'bodyBold' : 'heading3'} style={styles.textCenter}>
          {title}
        </AppText>
        {description ? (
          <AppText variant="caption" style={[styles.textCenter, { color: colors.textMuted }]}>
            {description}
          </AppText>
        ) : null}
      </View>
      {actionLabel && onActionPress ? (
        <View style={styles.actionWrap}>
          <Button
            label={actionLabel}
            onPress={onActionPress}
            variant="secondary"
            size="sm"
            fullWidth={false}
          />
        </View>
      ) : null}
    </View>
  );
}

export interface ErrorStateProps {
  title: string;
  description?: string;
  retryLabel?: string;
  onRetry?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function ErrorState({
  title,
  description,
  retryLabel,
  onRetry,
  style,
}: ErrorStateProps) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.surface, borderColor: colors.border },
        style,
      ]}
    >
      <View style={[styles.iconCircle, { backgroundColor: colors.dangerLight }]}>
        <Ionicons name="alert-circle-outline" size={28} color={colors.danger} />
      </View>
      <View style={styles.textGroup}>
        <AppText variant="heading3" style={styles.textCenter}>
          {title}
        </AppText>
        {description ? (
          <AppText variant="caption" style={[styles.textCenter, { color: colors.textMuted }]}>
            {description}
          </AppText>
        ) : null}
      </View>
      {retryLabel && onRetry ? (
        <View style={styles.actionWrap}>
          <Button
            label={retryLabel}
            onPress={onRetry}
            variant="secondary"
            size="sm"
            leftIcon="refresh-outline"
            fullWidth={false}
          />
        </View>
      ) : null}
    </View>
  );
}

export interface LoadingStateProps {
  label?: string;
  style?: StyleProp<ViewStyle>;
}

export function LoadingState({ label, style }: LoadingStateProps) {
  const { colors } = useTheme();
  return (
    <View style={[styles.loadingContainer, style]}>
      <ActivityIndicator size="large" color={colors.primary} />
      {label ? (
        <AppText variant="caption" style={{ color: colors.textMuted }}>
          {label}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.md,
  },
  compactContainer: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  textGroup: {
    alignItems: 'center',
    gap: 4,
  },
  textCenter: {
    textAlign: 'center',
  },
  actionWrap: {
    marginTop: spacing.xs,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
    gap: spacing.md,
  },
});
