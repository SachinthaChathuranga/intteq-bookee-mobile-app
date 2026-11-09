import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import type { QueueEntry } from '../../api/barber';
import { fetchBranchLiveFloor, type BarberFloorState } from '../../api/receptionist';
import { useQueueSocket } from '../../api/socket';
import { AppText } from '../../components/AppText';
import { useT } from '../../i18n';
import { WorkspaceHeader } from '../../navigation/workspaces/WorkspaceHeader';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { useTheme } from '../../theme/ThemeProvider';
import {
  Avatar,
  Badge,
  Card,
  Divider,
  EmptyState,
  FinancialSummaryCard,
  QueueTicketCard,
  Screen,
  SectionHeader,
  SkeletonCard,
  StatusBadge,
  radius,
  spacing,
  type BadgeTone,
} from '../../ui';

export function OwnerLiveFloorScreen() {
  const t = useT();
  const { colors } = useTheme();
  const activeBranchId = useWorkspaceStore((s) => s.activeBranchId);

  useQueueSocket(activeBranchId);

  const floorQuery = useQuery({
    queryKey: ['live-floor', activeBranchId],
    queryFn: () => fetchBranchLiveFloor(activeBranchId!),
    enabled: Boolean(activeBranchId),
  });

  if (!activeBranchId) {
    return (
      <View style={styles.flex}>
        <WorkspaceHeader title={t('floor.title')} />
        <Screen>
          <EmptyState icon="business-outline" title={t('owner.noBranches')} />
        </Screen>
      </View>
    );
  }

  const floor = floorQuery.data;
  const generalQueue = floor?.general_queue ?? [];
  const barbers = floor?.barbers ?? [];

  return (
    <View style={styles.flex}>
      <WorkspaceHeader title={t('floor.title')} />
      <Screen scroll={false} padded={false}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={floorQuery.isRefetching}
              onRefresh={() => {
                void floorQuery.refetch();
              }}
              tintColor={colors.primary}
            />
          }
        >
          <View style={styles.metricsRow}>
            <FinancialSummaryCard
              icon="people-outline"
              label={t('owner.waitingQueueMetric')}
              value={String(floor?.total_waiting_count ?? 0)}
              tone="primary"
            />
            <FinancialSummaryCard
              icon="cut-outline"
              label={t('owner.activeBarbersMetric')}
              value={String(floor?.active_barbers_count ?? 0)}
              tone="success"
            />
          </View>

          <View style={styles.sectionBlock}>
            <SectionHeader title={`${t('floor.generalQueue')} (${generalQueue.length})`} />

            {floorQuery.isLoading ? (
              <SkeletonCard />
            ) : generalQueue.length === 0 ? (
              <EmptyState compact icon="people-outline" title={t('floor.noGeneralQueue')} />
            ) : (
              generalQueue.map((entry: QueueEntry) => (
                <QueueTicketCard
                  key={entry.id}
                  tokenNumber={entry.token_number}
                  customerName={entry.customer_name || entry.walk_in_name || 'Walk-in'}
                  customerPhone={entry.customer_phone}
                  services={entry.services}
                  totalPrice={entry.total_price}
                  totalDurationMinutes={entry.total_duration}
                />
              ))
            )}
          </View>

          <View style={styles.sectionBlock}>
            <SectionHeader title={t('floor.activeBarbers')} />

            {barbers.length === 0 ? (
              <EmptyState compact icon="cut-outline" title={t('floor.noBarbersOnShift')} />
            ) : (
              barbers.map((b: BarberFloorState) => {
                const shiftTone: BadgeTone =
                  b.shift_status === 'ACTIVE'
                    ? 'success'
                    : b.shift_status === 'PAUSED'
                      ? 'warning'
                      : 'neutral';

                const shiftLabel =
                  b.shift_status === 'ACTIVE'
                    ? t('shift.active')
                    : b.shift_status === 'PAUSED'
                      ? t('shift.paused')
                      : t('shift.ended');

                return (
                  <Card key={b.barber_id} variant="elevated" padding="lg">
                    <View style={styles.rowBetween}>
                      <View style={styles.rowCenter}>
                        <Avatar
                          name={b.name || b.phone}
                          uri={b.avatar_url}
                          size="md"
                          status={
                            b.shift_status === 'ACTIVE'
                              ? 'online'
                              : b.shift_status === 'PAUSED'
                                ? 'paused'
                                : 'offline'
                          }
                        />
                        <View style={{ flex: 1, gap: 2 }}>
                          <AppText variant="heading3">{b.name || b.phone}</AppText>
                          <AppText variant="caption">
                            {t('floor.estimatedWaitShort', { minutes: b.wait_time_minutes })}
                          </AppText>
                        </View>
                      </View>
                      <StatusBadge label={shiftLabel} tone={shiftTone} size="sm" />
                    </View>

                    <Divider spacingVertical="md" />

                    {b.serving ? (
                      <View
                        style={[
                          styles.servingBox,
                          {
                            backgroundColor: colors.primaryLight,
                            borderColor: colors.primaryBorder,
                          },
                        ]}
                      >
                        <AppText variant="bodyBold" style={{ color: colors.primary }}>
                          {t('floor.servingNow', {
                            name:
                              b.serving.customer_name ||
                              b.serving.walk_in_name ||
                              'Walk-in',
                          })}
                        </AppText>
                        <AppText variant="caption" style={{ color: colors.textSecondary }}>
                          {b.serving.token_number ? `#${b.serving.token_number} • ` : ''}
                          {b.serving.services.map((s) => s.name).join(', ')}
                        </AppText>
                      </View>
                    ) : (
                      <View style={styles.idleRow}>
                        <Ionicons name="checkmark-circle-outline" size={16} color={colors.textMuted} />
                        <AppText variant="caption" style={{ color: colors.textMuted }}>
                          {t('floor.idleNoCustomer')}
                        </AppText>
                      </View>
                    )}

                    {b.waiting.length > 0 ? (
                      <View style={styles.waitingBlock}>
                        <AppText variant="label" style={{ color: colors.textSecondary }}>
                          {t('floor.waitingCount', { count: b.waiting.length })}
                        </AppText>
                        <View style={styles.waitingBadgesWrap}>
                          {b.waiting.map((w) => (
                            <Badge
                              key={w.id}
                              label={`${w.token_number ? `#${w.token_number} ` : ''}${
                                w.customer_name || w.walk_in_name || 'Walk-in'
                              }`}
                              tone="neutral"
                              size="sm"
                            />
                          ))}
                        </View>
                      </View>
                    ) : null}
                  </Card>
                );
              })
            )}
          </View>
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
    padding: spacing.lg,
    gap: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  sectionBlock: {
    gap: spacing.md,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  rowCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  servingBox: {
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: 2,
  },
  idleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  waitingBlock: {
    marginTop: spacing.md,
    gap: spacing.xs + 2,
  },
  waitingBadgesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
});
