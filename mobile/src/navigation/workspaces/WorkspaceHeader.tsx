import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '../../components/AppText';
import { useT } from '../../i18n';
import type { TranslationKey } from '../../i18n/en';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { useTheme } from '../../theme/ThemeProvider';
import { IconButton } from '../../ui/Button';
import { lightImpact } from '../../ui/haptics';
import { radius, spacing } from '../../ui/tokens';

interface Props {
  title: string;
  onBack?: () => void;
}

export function WorkspaceHeader({ title, onBack }: Props) {
  const t = useT();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const activeWorkspace = useWorkspaceStore((s) => s.activeWorkspace);
  const clearWorkspace = useWorkspaceStore((s) => s.clearWorkspace);

  const roleLabel = activeWorkspace
    ? t(`role.${activeWorkspace.role}` as TranslationKey)
    : t('workspace.activeBanner');

  const subtitle = [
    roleLabel,
    activeWorkspace?.business_name,
    activeWorkspace?.branch_name,
  ]
    .filter(Boolean)
    .join(' • ');

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top + spacing.sm,
          backgroundColor: colors.navigationBackground,
          borderBottomColor: colors.border,
        },
      ]}
    >
      <View style={styles.row}>
        <View style={styles.leftCluster}>
          {onBack ? (
            <IconButton
              icon="arrow-back"
              size="sm"
              variant="subtle"
              onPress={onBack}
              accessibilityLabel={t('common.back')}
            />
          ) : null}
          <View style={styles.titleStack}>
            <View style={styles.badgeRow}>
              <View style={[styles.roleDot, { backgroundColor: colors.primary }]} />
              <AppText
                variant="label"
                style={{ color: colors.primary, fontSize: 11 }}
                numberOfLines={1}
              >
                {subtitle}
              </AppText>
            </View>
            <AppText variant="heading2" numberOfLines={1}>
              {title}
            </AppText>
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={() => {
            lightImpact();
            clearWorkspace();
          }}
          style={({ pressed }) => [
            styles.exitPill,
            {
              backgroundColor: colors.primaryLight,
              borderColor: colors.primaryBorder,
              opacity: pressed ? 0.8 : 1,
            },
          ]}
        >
          <Ionicons name="swap-horizontal-outline" size={14} color={colors.primary} />
          <AppText variant="label" style={{ color: colors.primary, fontSize: 11 }}>
            {t('nav.exitWorkspace')}
          </AppText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm + 2,
    borderBottomWidth: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  leftCluster: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
  },
  titleStack: {
    flex: 1,
    gap: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  roleDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  exitPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
  },
});
