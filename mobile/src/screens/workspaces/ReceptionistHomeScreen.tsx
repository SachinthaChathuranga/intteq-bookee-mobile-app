import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import {
  Linking,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import {
  markCustomerLeft,
  markNoShow,
  requestCancelCustomer,
  type QueueEntry,
} from '../../api/barber';
import {
  assignGeneralCustomer,
  fetchBranchLiveFloor,
  type BarberFloorState,
} from '../../api/receptionist';
import { useQueueSocket } from '../../api/socket';
import { AppText } from '../../components/AppText';
import { useT } from '../../i18n';
import type { ReceptionistStackParamList } from '../../navigation/types';
import { WorkspaceHeader } from '../../navigation/workspaces/WorkspaceHeader';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { useTheme } from '../../theme/ThemeProvider';
import {
  Avatar,
  Badge,
  Button,
  Card,
  Chip,
  ConfirmationDialog,
  Divider,
  EmptyState,
  FinancialSummaryCard,
  QueueTicketCard,
  Screen,
  SectionHeader,
  SkeletonCard,
  StatusBadge,
  haptics,
  radius,
  spacing,
  useToast,
  type BadgeTone,
} from '../../ui';

type Props = NativeStackScreenProps<ReceptionistStackParamList, 'ReceptionistHome'>;

export function ReceptionistHomeScreen({ navigation }: Props) {
  const t = useT();
  const { colors } = useTheme();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const activeWorkspace = useWorkspaceStore((s) => s.activeWorkspace);
  const branchId = activeWorkspace?.branch_id;

  const [cancelConfirmEntry, setCancelConfirmEntry] = useState<QueueEntry | null>(null);

  useQueueSocket(branchId);

  const floorQuery = useQuery({
    queryKey: ['live-floor', branchId],
    queryFn: () => fetchBranchLiveFloor(branchId!),
    enabled: Boolean(branchId),
  });

  const refreshFloor = () => {
    queryClient.invalidateQueries({ queryKey: ['live-floor', branchId] });
  };

  const assignMutation = useMutation({
    mutationFn: ({ entryId, targetBarberId }: { entryId: string; targetBarberId: string }) =>
      assignGeneralCustomer(branchId!, entryId, targetBarberId),
    onSuccess: () => {
      haptics.success();
      refreshFloor();
    },
    onError: (err: any) => {
      showToast({ title: err?.message || t('common.error.generic'), tone: 'error' });
    },
  });

  const noShowMutation = useMutation({
    mutationFn: (entryId: string) => markNoShow(branchId!, entryId),
    onSuccess: () => {
      haptics.light();
      refreshFloor();
    },
  });

  const leftMutation = useMutation({
    mutationFn: (entryId: string) => markCustomerLeft(branchId!, entryId),
    onSuccess: () => {
      haptics.light();
      refreshFloor();
    },
  });

  const requestCancelMutation = useMutation({
    mutationFn: (entryId: string) => requestCancelCustomer(branchId!, entryId),
    onSuccess: () => {
      haptics.success();
      setCancelConfirmEntry(null);
      showToast({ title: t('queue.requestCancelSuccess'), tone: 'success' });
    },
    onError: (err: any) => {
      setCancelConfirmEntry(null);
      showToast({ title: err?.message || t('common.error.generic'), tone: 'error' });
    },
  });

  const handleCallPhone = (phone: string | null) => {
    if (!phone) {
      showToast({ title: t('queue.requestCancelNoPhone'), tone: 'warning' });
      return;
    }
    Linking.openURL(`tel:${phone}`).catch(() => {
      showToast({ title: t('common.error.generic'), tone: 'error' });
    });
  };

  if (!branchId) {
    return (
      <View style={styles.flex}>
        <WorkspaceHeader title={t('workspace.receptionist.title')} />
        <Screen>
          <EmptyState
            icon="desktop-outline"
            title={t('barber.noBranchAssigned')}
            description={t('workspace.receptionist.placeholder')}
          />
        </Screen>
      </View>
    );
  }

  const floor = floorQuery.data;
  const generalQueue = floor?.general_queue ?? [];
  const barbers = floor?.barbers ?? [];
  const activeBarbers = barbers.filter((b) => b.shift_status === 'ACTIVE');

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
              onRefresh={refreshFloor}
              tintColor={colors.primary}
            />
          }
        >
          {/* Live Metrics + Walk-In Action */}
          <View style={styles.metricsSection}>
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
            <Button
              label={t('walkin.title')}
              size="lg"
              leftIcon="person-add-outline"
              onPress={() => navigation.navigate('AddWalkIn')}
            />
          </View>

          {/* General Queue Section */}
          <View style={styles.sectionBlock}>
            <SectionHeader
              title={`${t('floor.generalQueue')} (${generalQueue.length})`}
            />

            {floorQuery.isLoading ? (
              <SkeletonCard />
            ) : generalQueue.length === 0 ? (
              <EmptyState
                compact
                icon="people-outline"
                title={t('floor.noGeneralQueue')}
              />
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
                  rightControls={
                    <Button
                      label={t('queue.customerLeft')}
                      variant="danger"
                      size="sm"
                      fullWidth={false}
                      onPress={() => leftMutation.mutate(entry.id)}
                    />
                  }
                  actions={
                    <View style={styles.generalActionsCol}>
                      {entry.customer_phone ? (
                        <View style={styles.rowGapSm}>
                          <View style={styles.flexItem}>
                            <Button
                              label={t('queue.callCustomer')}
                              variant="secondary"
                              size="sm"
                              leftIcon="call-outline"
                              onPress={() => handleCallPhone(entry.customer_phone)}
                            />
                          </View>
                          <View style={styles.flexItem}>
                            <Button
                              label={t('queue.requestCancel')}
                              variant="ghost"
                              size="sm"
                              leftIcon="chatbubble-ellipses-outline"
                              onPress={() => setCancelConfirmEntry(entry)}
                            />
                          </View>
                        </View>
                      ) : null}

                      {activeBarbers.length > 0 ? (
                        <View style={styles.assignBlock}>
                          <AppText variant="label" style={{ color: colors.textSecondary }}>
                            {t('floor.assignTo')}
                          </AppText>
                          <View style={styles.assignChipsRow}>
                            {activeBarbers.map((b) => (
                              <Chip
                                key={b.barber_id}
                                label={b.name || b.phone}
                                leftIcon="cut-outline"
                                onPress={() =>
                                  assignMutation.mutate({
                                    entryId: entry.id,
                                    targetBarberId: b.barber_id,
                                  })
                                }
                              />
                            ))}
                          </View>
                        </View>
                      ) : null}
                    </View>
                  }
                />
              ))
            )}
          </View>

          {/* Barber Chairs & Queues */}
          <View style={styles.sectionBlock}>
            <SectionHeader title={t('floor.activeBarbers')} />

            {barbers.length === 0 ? (
              <EmptyState
                compact
                icon="cut-outline"
                title={t('floor.noBarbersOnShift')}
              />
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

                    {/* Serving Customer */}
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
                        <View style={styles.rowBetween}>
                          <View style={{ flex: 1, gap: 2 }}>
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
                          <Button
                            label={t('queue.noShow')}
                            variant="danger"
                            size="sm"
                            fullWidth={false}
                            onPress={() => noShowMutation.mutate(b.serving!.id)}
                          />
                        </View>
                      </View>
                    ) : (
                      <View style={styles.idleRow}>
                        <Ionicons name="checkmark-circle-outline" size={16} color={colors.textMuted} />
                        <AppText variant="caption" style={{ color: colors.textMuted }}>
                          {t('floor.idleNoCustomer')}
                        </AppText>
                      </View>
                    )}

                    {/* Barber's Waiting Queue */}
                    {b.waiting.length > 0 ? (
                      <View style={styles.barberWaitingBlock}>
                        <AppText variant="label" style={{ color: colors.textSecondary }}>
                          {t('floor.waitingCount', { count: b.waiting.length })}
                        </AppText>
                        {b.waiting.map((w) => (
                          <View
                            key={w.id}
                            style={[
                              styles.waitingMiniCard,
                              {
                                backgroundColor: colors.inputBackground,
                                borderColor: colors.border,
                              },
                            ]}
                          >
                            <View style={styles.rowBetween}>
                              <View style={styles.rowCenter}>
                                <Badge label={w.token_number || '#'} tone="primary" size="sm" />
                                <AppText variant="bodyBold" numberOfLines={1} style={{ flex: 1 }}>
                                  {w.customer_name || w.walk_in_name || 'Walk-in'}
                                </AppText>
                              </View>
                              <Button
                                label={t('queue.customerLeft')}
                                variant="danger"
                                size="sm"
                                fullWidth={false}
                                onPress={() => leftMutation.mutate(w.id)}
                              />
                            </View>
                            {w.customer_phone ? (
                              <View style={[styles.rowGapSm, { marginTop: spacing.xs }]}>
                                <View style={styles.flexItem}>
                                  <Button
                                    label={t('queue.callCustomer')}
                                    variant="secondary"
                                    size="sm"
                                    leftIcon="call-outline"
                                    onPress={() => handleCallPhone(w.customer_phone)}
                                  />
                                </View>
                                <View style={styles.flexItem}>
                                  <Button
                                    label={t('queue.requestCancel')}
                                    variant="ghost"
                                    size="sm"
                                    onPress={() => setCancelConfirmEntry(w)}
                                  />
                                </View>
                              </View>
                            ) : null}
                          </View>
                        ))}
                      </View>
                    ) : null}
                  </Card>
                );
              })
            )}
          </View>
        </ScrollView>

        <ConfirmationDialog
          visible={Boolean(cancelConfirmEntry)}
          title={t('queue.requestCancel')}
          description={t('queue.requestCancelConfirm')}
          confirmLabel={t('common.confirm')}
          cancelLabel={t('common.cancel')}
          tone="warning"
          icon="chatbubble-ellipses-outline"
          loading={requestCancelMutation.isPending}
          onConfirm={() => {
            if (cancelConfirmEntry) {
              requestCancelMutation.mutate(cancelConfirmEntry.id);
            }
          }}
          onCancel={() => setCancelConfirmEntry(null)}
        />
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
  metricsSection: {
    gap: spacing.md,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  sectionBlock: {
    gap: spacing.md,
  },
  generalActionsCol: {
    gap: spacing.sm,
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
    gap: spacing.sm + 2,
    flex: 1,
  },
  rowGapSm: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  flexItem: {
    flex: 1,
  },
  assignBlock: {
    gap: 6,
    marginTop: 4,
  },
  assignChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  servingBox: {
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  idleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  barberWaitingBlock: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  waitingMiniCard: {
    padding: spacing.sm + 2,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: 4,
  },
});
