import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { ScrollView, StyleSheet, View } from 'react-native';
import { fetchCurrentShift } from '../../api/barber';
import { AppText } from '../../components/AppText';
import { useT } from '../../i18n';
import type { BarberStackParamList } from '../../navigation/types';
import { WorkspaceHeader } from '../../navigation/workspaces/WorkspaceHeader';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { useTheme } from '../../theme/ThemeProvider';
import {
  Button,
  Card,
  EmptyState,
  FinancialSummaryCard,
  Screen,
  SkeletonCard,
  StatusBadge,
  spacing,
} from '../../ui';
import { formatCurrency } from '../../utils/format';

type Props = NativeStackScreenProps<BarberStackParamList, 'EndShift'>;

export function EndShiftScreen({ route, navigation }: Props) {
  const t = useT();
  const { colors } = useTheme();
  const activeWorkspace = useWorkspaceStore((s) => s.activeWorkspace);
  const branchId = activeWorkspace?.branch_id;

  const routeSummary = route.params?.summary;

  const shiftQuery = useQuery({
    queryKey: ['barber-shift', branchId],
    queryFn: () => fetchCurrentShift(branchId!),
    enabled: Boolean(branchId) && !routeSummary,
  });

  const summary = routeSummary ?? shiftQuery.data?.summary ?? null;

  const hours = summary ? Math.floor(summary.duration_minutes / 60) : 0;
  const mins = summary ? summary.duration_minutes % 60 : 0;
  const durationStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

  return (
    <View style={styles.flex}>
      <WorkspaceHeader title={t('shift.summaryTitle')} />
      <Screen scroll={false}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {shiftQuery.isLoading ? (
            <SkeletonCard />
          ) : !summary ? (
            <EmptyState
              icon="time-outline"
              title={t('shift.ended')}
              description={t('workspace.barber.placeholder')}
            />
          ) : (
            <>
              <Card variant="selected" padding="xl" style={styles.heroCard}>
                <View style={[styles.heroIconCircle, { backgroundColor: colors.primary }]}>
                  <Ionicons name="wallet-outline" size={28} color={colors.onPrimary} />
                </View>
                <AppText variant="label" style={{ color: colors.textSecondary }}>
                  {t('shift.commissionEarned')}
                </AppText>
                <AppText variant="display" style={{ color: colors.primary }}>
                  {formatCurrency(summary.total_commission)}
                </AppText>
                <StatusBadge
                  label={
                    summary.shift.status === 'ACTIVE'
                      ? t('shift.active')
                      : summary.shift.status === 'PAUSED'
                        ? t('shift.paused')
                        : t('shift.ended')
                  }
                  tone={summary.shift.status === 'ACTIVE' ? 'success' : 'neutral'}
                />
              </Card>

              <View style={styles.metricsGrid}>
                <View style={styles.metricsRow}>
                  <FinancialSummaryCard
                    icon="time-outline"
                    label={t('shift.duration')}
                    value={durationStr}
                    tone="info"
                  />
                  <FinancialSummaryCard
                    icon="checkmark-done-outline"
                    label={t('shift.completedServices')}
                    value={String(summary.completed_services_count)}
                    tone="success"
                  />
                </View>
                <View style={styles.metricsRow}>
                  <FinancialSummaryCard
                    icon="cash-outline"
                    label={t('shift.totalRevenue')}
                    value={formatCurrency(summary.total_revenue)}
                    tone="primary"
                  />
                </View>
              </View>
            </>
          )}

          {routeSummary ? (
            <Button
              label={t('common.done')}
              onPress={() => navigation.navigate('BarberTabs', { screen: 'QueueTab' })}
            />
          ) : null}
        </ScrollView>
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  scrollContent: {
    gap: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  heroCard: {
    alignItems: 'center',
    gap: spacing.xs + 2,
  },
  heroIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  metricsGrid: {
    gap: spacing.md,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
});
