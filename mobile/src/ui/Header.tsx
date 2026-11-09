import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { AppText } from '../components/AppText';
import { useTheme } from '../theme/ThemeProvider';
import { IconButton } from './Button';
import { lightImpact } from './haptics';
import { spacing } from './tokens';

export interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  rightAction?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function ScreenHeader({
  title,
  subtitle,
  onBack,
  rightAction,
  style,
}: ScreenHeaderProps) {
  const { colors } = useTheme();
  return (
    <View style={[styles.screenHeader, style]}>
      <View style={styles.screenHeaderLeft}>
        {onBack ? (
          <IconButton
            icon="arrow-back"
            onPress={onBack}
            variant="surface"
            size="md"
            accessibilityLabel="Back"
          />
        ) : null}
        <View style={styles.titleBlock}>
          <AppText variant="heading1" numberOfLines={1}>
            {title}
          </AppText>
          {subtitle ? (
            <AppText variant="caption" style={{ color: colors.textMuted }} numberOfLines={1}>
              {subtitle}
            </AppText>
          ) : null}
        </View>
      </View>
      {rightAction ? <View style={styles.rightSlot}>{rightAction}</View> : null}
    </View>
  );
}

export interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onActionPress?: () => void;
  rightElement?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function SectionHeader({
  title,
  subtitle,
  actionLabel,
  onActionPress,
  rightElement,
  style,
}: SectionHeaderProps) {
  const { colors } = useTheme();
  return (
    <View style={[styles.sectionHeader, style]}>
      <View style={{ flex: 1, gap: 2 }}>
        <AppText variant="heading3">{title}</AppText>
        {subtitle ? (
          <AppText variant="caption" style={{ color: colors.textMuted }}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {rightElement ? (
        rightElement
      ) : actionLabel && onActionPress ? (
        <Pressable
          onPress={() => {
            lightImpact();
            onActionPress();
          }}
          hitSlop={8}
          style={styles.actionBtn}
        >
          <AppText variant="label" style={{ color: colors.primary, fontSize: 13 }}>
            {actionLabel}
          </AppText>
          <Ionicons name="chevron-forward" size={14} color={colors.primary} />
        </Pressable>
      ) : null}
    </View>
  );
}

export interface DividerProps {
  spacingVertical?: keyof typeof spacing | number;
  style?: StyleProp<ViewStyle>;
}

export function Divider({ spacingVertical = 0, style }: DividerProps) {
  const { colors } = useTheme();
  const marginV = typeof spacingVertical === 'number' ? spacingVertical : spacing[spacingVertical];
  return (
    <View
      style={[
        styles.divider,
        { backgroundColor: colors.divider, marginVertical: marginV },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  screenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  screenHeaderLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  titleBlock: {
    flex: 1,
    gap: 2,
  },
  rightSlot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: 4,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    width: '100%',
  },
});

