import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { AppText } from '../../components/AppText';
import { useT } from '../../i18n';
import { WorkspaceHeader } from '../../navigation/workspaces/WorkspaceHeader';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { useTheme } from '../../theme/ThemeProvider';
import { Button, Card, Screen, StatusBadge, radius, spacing } from '../../ui';

export function AdminHomeScreen() {
  const t = useT();
  const { colors } = useTheme();
  const clearWorkspace = useWorkspaceStore((s) => s.clearWorkspace);

  return (
    <View style={styles.flex}>
      <WorkspaceHeader title={t('workspace.admin.title')} />
      <Screen>
        <View style={styles.container}>
          <Card variant="selected" padding="xl" style={styles.heroCard}>
            <View style={[styles.iconCircle, { backgroundColor: colors.primary }]}>
              <Ionicons name="shield-checkmark" size={32} color={colors.onPrimary} />
            </View>
            <StatusBadge label={t('admin.statusOperational')} tone="success" />
            <AppText variant="heading1" style={styles.centerText}>
              {t('workspace.admin.title')}
            </AppText>
            <AppText
              variant="bodySmall"
              style={[styles.centerText, { color: colors.textSecondary }]}
            >
              {t('workspace.admin.placeholder')}
            </AppText>
          </Card>

          <Card variant="outlined" padding="lg">
            <View style={styles.noticeRow}>
              <Ionicons name="information-circle-outline" size={22} color={colors.primary} />
              <AppText variant="caption" style={{ color: colors.textSecondary, flex: 1 }}>
                {t('admin.phaseNotice')}
              </AppText>
            </View>
          </Card>

          <Button
            variant="secondary"
            label={t('workspace.backToCustomer')}
            leftIcon="swap-horizontal-outline"
            onPress={clearWorkspace}
          />
        </View>
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    gap: spacing.lg,
  },
  heroCard: {
    alignItems: 'center',
    gap: spacing.sm + 2,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  centerText: {
    textAlign: 'center',
  },
  noticeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
});
