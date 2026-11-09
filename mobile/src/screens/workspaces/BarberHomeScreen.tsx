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
  autoReassignAll,
  callNextCustomer,
  devEnqueueCustomer,
  endShift,
  fetchBarberQueue,
  fetchCurrentShift,
  markCustomerLeft,
  markNoShow,
  pauseShift,
  reassignCustomer,
  reorderQueue,
  requestCancelCustomer,
  resumeShift,
  startShift,
  type QueueEntry,
} from '../../api/barber';
import { fetchServices } from '../../api/owner';
import { useQueueSocket } from '../../api/socket';
import { AppText } from '../../components/AppText';
import { useT } from '../../i18n';
import type { BarberStackParamList } from '../../navigation/types';
import { WorkspaceHeader } from '../../navigation/workspaces/WorkspaceHeader';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { useTheme } from '../../theme/ThemeProvider';
import {
  Avatar,
  Badge,
  BottomSheet,
  Button,
  Card,
  ConfirmationDialog,
  EmptyState,
  IconButton,
  OptionCard,
  QueueTicketCard,
  Screen,
  SectionHeader,
  StatusBadge,
  haptics,
  spacing,
  useToast,
} from '../../ui';

type Props = NativeStackScreenProps<BarberStackParamList, 'BarberHome'>;

export function BarberHomeScreen({ navigation }: Props) {
  const t = useT();
  const { colors } = useTheme();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const activeWorkspace = useWorkspaceStore((s) => s.activeWorkspace);
  const branchId = activeWorkspace?.branch_id;

  const [reassignEntry, setReassignEntry] = useState<QueueEntry | null>(null);
  const [cancelConfirmEntry, setCancelConfirmEntry] = useState<QueueEntry | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useQueueSocket(branchId);

  const shiftQuery = useQuery({
    queryKey: ['barber-shift', branchId],
    queryFn: () => fetchCurrentShift(branchId!),
    enabled: Boolean(branchId),
  });

  const queueQuery = useQuery({
    queryKey: ['barber-queue', branchId],
    queryFn: () => fetchBarberQueue(branchId!),
    enabled: Boolean(branchId),
  });

  const servicesQuery = useQuery({
    queryKey: ['services', branchId],
    queryFn: () => fetchServices(branchId!),
    enabled: Boolean(branchId),
  });

  const refreshAll = () => {
    queryClient.invalidateQueries({ queryKey: ['barber-shift', branchId] });
    queryClient.invalidateQueries({ queryKey: ['barber-queue', branchId] });
  };

  const startMutation = useMutation({
    mutationFn: () => startShift(branchId!),
    onSuccess: () => {
      haptics.success();
      setErrorMsg(null);
      refreshAll();
    },
    onError: (err: any) => setErrorMsg(err?.message || t('common.error.generic')),
  });

  const pauseMutation = useMutation({
    mutationFn: () => pauseShift(branchId!),
    onSuccess: () => {
      haptics.medium();
      setErrorMsg(null);
      refreshAll();
    },
    onError: (err: any) => setErrorMsg(err?.message || t('common.error.generic')),
  });

  const resumeMutation = useMutation({
    mutationFn: () => resumeShift(branchId!),
    onSuccess: () => {
      haptics.light();
      setErrorMsg(null);
      refreshAll();
    },
    onError: (err: any) => setErrorMsg(err?.message || t('common.error.generic')),
  });

  const endMutation = useMutation({
    mutationFn: () => endShift(branchId!),
    onSuccess: (data) => {
      haptics.success();
      setErrorMsg(null);
      refreshAll();
      navigation.navigate('EndShift', { summary: data.summary });
    },
    onError: (err: any) => {
      setErrorMsg(err?.message || t('shift.mustResolveQueue'));
      showToast({ title: err?.message || t('shift.mustResolveQueue'), tone: 'warning' });
    },
  });

  const callNextMutation = useMutation({
    mutationFn: () => callNextCustomer(branchId!),
    onSuccess: () => {
      haptics.medium();
      setErrorMsg(null);
      refreshAll();
    },
    onError: (err: any) => setErrorMsg(err?.message || t('common.error.generic')),
  });

  const noShowMutation = useMutation({
    mutationFn: (entryId: string) => markNoShow(branchId!, entryId),
    onSuccess: () => {
      haptics.light();
      refreshAll();
    },
  });

  const leftMutation = useMutation({
    mutationFn: (entryId: string) => markCustomerLeft(branchId!, entryId),
    onSuccess: () => {
      haptics.light();
      refreshAll();
    },
  });

  const reassignMutation = useMutation({
    mutationFn: ({ entryId, targetBarberId }: { entryId: string; targetBarberId: string }) =>
      reassignCustomer(branchId!, entryId, targetBarberId),
    onSuccess: () => {
      haptics.success();
      setReassignEntry(null);
      refreshAll();
    },
    onError: (err: any) => {
      showToast({ title: err?.message || t('common.error.generic'), tone: 'error' });
    },
  });

  const autoReassignMutation = useMutation({
    mutationFn: () => autoReassignAll(branchId!),
    onSuccess: () => {
      haptics.success();
      setErrorMsg(null);
      refreshAll();
    },
    onError: (err: any) => {
      setErrorMsg(err?.message || t('common.error.generic'));
    },
  });

  const reorderMutation = useMutation({
    mutationFn: (entryIds: string[]) => reorderQueue(branchId!, entryIds),
    onSuccess: () => {
      haptics.selection();
      refreshAll();
    },
  });

  const devEnqueueMutation = useMutation({
    mutationFn: async () => {
      const svcs = servicesQuery.data ?? [];
      const firstSvc = svcs[0];
      if (!firstSvc) throw new Error(t('service.noServices'));
      const randNum = Math.floor(Math.random() * 90) + 10;
      return await devEnqueueCustomer(branchId!, {
        customerName: `Walk-in #${randNum}`,
        tokenNumber: `A${randNum}`,
        serviceIds: [firstSvc.id],
        queueType: 'BARBER',
      });
    },
    onSuccess: () => {
      haptics.light();
      refreshAll();
    },
    onError: (err: any) => {
      showToast({ title: err?.message || t('common.error.generic'), tone: 'error' });
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
        <WorkspaceHeader title={t('workspace.barber.title')} />
        <Screen>
          <EmptyState
            icon="cut-outline"
            title={t('barber.noBranchAssigned')}
            description={t('workspace.barber.placeholder')}
          />
        </Screen>
      </View>
    );
  }

  const shift = shiftQuery.data?.shift ?? null;
  const onShiftBarbers = shiftQuery.data?.on_shift_barbers ?? [];
  const serving = queueQuery.data?.serving ?? null;
  const waiting = queueQuery.data?.waiting ?? [];
  const generalCount = queueQuery.data?.generalCount ?? 0;

  const moveCustomer = (index: number, direction: -1 | 1) => {
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= waiting.length) return;
    const ids = waiting.map((w) => w.id);
    const temp = ids[index];
    ids[index] = ids[targetIdx];
    ids[targetIdx] = temp;
    reorderMutation.mutate(ids);
  };

  const shiftStatusTone =
    shift?.status === 'ACTIVE'
      ? 'success'
      : shift?.status === 'PAUSED'
        ? 'warning'
        : 'neutral';

  const shiftStatusLabel =
    shift?.status === 'ACTIVE'
      ? t('shift.active')
      : shift?.status === 'PAUSED'
        ? t('shift.paused')
        : t('shift.ended');

  const isRefreshing = shiftQuery.isRefetching || queueQuery.isRefetching;

  return (
    <View style={styles.flex}>
      <WorkspaceHeader title={t('workspace.barber.title')} />
      <Screen scroll={false} padded={false}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={refreshAll}
              tintColor={colors.primary}
            />
          }
        >
          {/* Shift Controls Card */}
          <Card variant="elevated" padding="lg">
            <View style={styles.rowBetween}>
              <View style={{ flex: 1, gap: 4 }}>
                <StatusBadge label={shiftStatusLabel} tone={shiftStatusTone} />
                {shift ? (
                  <AppText variant="caption" style={{ color: colors.textMuted, marginTop: 2 }}>
                    {new Date(shift.start_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </AppText>
                ) : null}
              </View>
              <Button
                label={t('barber.devTestCustomer')}
                variant="subtle"
                size="sm"
                fullWidth={false}
                loading={devEnqueueMutation.isPending}
                onPress={() => devEnqueueMutation.mutate()}
              />
            </View>

            <View style={styles.shiftActionsGrid}>
              {!shift || shift.status === 'ENDED' ? (
                <Button
                  label={t('shift.start')}
                  variant="primary"
                  leftIcon="play"
                  onPress={() => startMutation.mutate()}
                  loading={startMutation.isPending}
                />
              ) : (
                <>
                  <View style={styles.flexItem}>
                    {shift.status === 'ACTIVE' ? (
                      <Button
                        label={t('shift.pause')}
                        variant="secondary"
                        size="sm"
                        leftIcon="pause"
                        onPress={() => pauseMutation.mutate()}
                        loading={pauseMutation.isPending}
                      />
                    ) : (
                      <Button
                        label={t('shift.resume')}
                        variant="primary"
                        size="sm"
                        leftIcon="play"
                        onPress={() => resumeMutation.mutate()}
                        loading={resumeMutation.isPending}
                      />
                    )}
                  </View>
                  <View style={styles.flexItem}>
                    <Button
                      label={t('shift.end')}
                      variant="danger"
                      size="sm"
                      leftIcon="stop"
                      onPress={() => endMutation.mutate()}
                      loading={endMutation.isPending}
                    />
                  </View>
                </>
              )}
            </View>

            {waiting.length > 0 && shift && shift.status !== 'ENDED' ? (
              <View style={{ marginTop: spacing.sm }}>
                <Button
                  label={t('queue.autoReassignAll')}
                  variant="ghost"
                  size="sm"
                  leftIcon="swap-horizontal-outline"
                  onPress={() => autoReassignMutation.mutate()}
                  loading={autoReassignMutation.isPending}
                />
              </View>
            ) : null}

            {errorMsg ? (
              <AppText variant="error" style={{ marginTop: spacing.xs }}>
                {errorMsg}
              </AppText>
            ) : null}
          </Card>

          {/* Currently Serving Section */}
          <View style={styles.sectionBlock}>
            <SectionHeader
              title={t('queue.currentlyServing')}
              rightElement={
                generalCount > 0 ? (
                  <Badge
                    label={t('queue.generalAvailable', { count: generalCount })}
                    tone="primary"
                    size="sm"
                  />
                ) : undefined
              }
            />

            {serving ? (
              <QueueTicketCard
                highlighted
                tokenNumber={serving.token_number}
                customerName={serving.customer_name || serving.walk_in_name || 'Walk-in'}
                customerPhone={serving.customer_phone}
                services={serving.services}
                totalPrice={serving.total_price}
                totalDurationMinutes={serving.total_duration}
                statusLabel={serving.status}
                statusTone="success"
                actions={
                  <View style={styles.servingActionsCol}>
                    <Button
                      label={t('queue.completeService')}
                      variant="primary"
                      size="lg"
                      leftIcon="checkmark-circle"
                      onPress={() =>
                        navigation.navigate('CompleteService', {
                          branchId,
                          entry: serving,
                        })
                      }
                    />
                    <View style={styles.rowGapSm}>
                      {serving.customer_phone ? (
                        <View style={styles.flexItem}>
                          <Button
                            label={t('queue.callCustomer')}
                            variant="secondary"
                            size="sm"
                            leftIcon="call-outline"
                            onPress={() => handleCallPhone(serving.customer_phone)}
                          />
                        </View>
                      ) : null}
                      <View style={styles.flexItem}>
                        <Button
                          label={t('queue.reassign')}
                          variant="secondary"
                          size="sm"
                          leftIcon="swap-horizontal-outline"
                          onPress={() => setReassignEntry(serving)}
                        />
                      </View>
                      <View style={styles.flexItem}>
                        <Button
                          label={t('queue.noShow')}
                          variant="danger"
                          size="sm"
                          onPress={() => noShowMutation.mutate(serving.id)}
                          loading={noShowMutation.isPending}
                        />
                      </View>
                    </View>
                  </View>
                }
              />
            ) : (
              <Card variant="outlined" padding="lg">
                <View style={{ alignItems: 'center', gap: spacing.md }}>
                  <AppText variant="bodySmall" style={{ color: colors.textSecondary, textAlign: 'center' }}>
                    {t('barber.idleCurrentlyServing')}
                  </AppText>
                  <Button
                    label={t('queue.callNext')}
                    variant="primary"
                    size="lg"
                    leftIcon="megaphone-outline"
                    disabled={!shift || shift.status !== 'ACTIVE' || (waiting.length === 0 && generalCount === 0)}
                    loading={callNextMutation.isPending}
                    onPress={() => callNextMutation.mutate()}
                  />
                </View>
              </Card>
            )}
          </View>

          {/* Waiting Queue List */}
          <View style={styles.sectionBlock}>
            <SectionHeader
              title={`${t('queue.waitingTitle')} (${waiting.length})`}
            />

            {waiting.length === 0 ? (
              <EmptyState
                compact
                icon="people-outline"
                title={t('queue.empty')}
              />
            ) : (
              waiting.map((entry, idx) => (
                <QueueTicketCard
                  key={entry.id}
                  tokenNumber={entry.token_number || `${idx + 1}`}
                  customerName={entry.customer_name || entry.walk_in_name || 'Walk-in'}
                  customerPhone={entry.customer_phone}
                  services={entry.services}
                  totalPrice={entry.total_price}
                  totalDurationMinutes={entry.total_duration}
                  rightControls={
                    <View style={styles.reorderGroup}>
                      <IconButton
                        icon="chevron-up"
                        size="sm"
                        variant="subtle"
                        disabled={idx === 0}
                        accessibilityLabel={t('queue.moveUp')}
                        onPress={() => moveCustomer(idx, -1)}
                      />
                      <IconButton
                        icon="chevron-down"
                        size="sm"
                        variant="subtle"
                        disabled={idx === waiting.length - 1}
                        accessibilityLabel={t('queue.moveDown')}
                        onPress={() => moveCustomer(idx, 1)}
                      />
                    </View>
                  }
                  actions={
                    <View style={styles.waitingActionsCol}>
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
                      <View style={styles.rowGapSm}>
                        <View style={styles.flexItem}>
                          <Button
                            label={t('queue.reassign')}
                            variant="secondary"
                            size="sm"
                            leftIcon="swap-horizontal-outline"
                            onPress={() => setReassignEntry(entry)}
                          />
                        </View>
                        <View style={styles.flexItem}>
                          <Button
                            label={t('queue.customerLeft')}
                            variant="danger"
                            size="sm"
                            onPress={() => leftMutation.mutate(entry.id)}
                          />
                        </View>
                      </View>
                    </View>
                  }
                />
              ))
            )}
          </View>
        </ScrollView>

        {/* Reassign Customer BottomSheet */}
        <BottomSheet
          visible={Boolean(reassignEntry)}
          onClose={() => setReassignEntry(null)}
          title={t('queue.reassignTitle')}
          subtitle={t('queue.reassignSubtitle')}
        >
          {onShiftBarbers.filter((b) => b.barber_id !== shift?.barber_id).length === 0 ? (
            <EmptyState
              compact
              icon="people-outline"
              title={t('floor.noBarbersOnShift')}
            />
          ) : (
            <View style={{ gap: spacing.sm }}>
              {onShiftBarbers
                .filter((b) => b.barber_id !== shift?.barber_id)
                .map((b) => (
                  <OptionCard
                    key={b.barber_id}
                    title={b.name || b.phone}
                    subtitle={b.phone}
                    leftElement={<Avatar name={b.name || b.phone} size="sm" status="online" />}
                    onPress={() => {
                      if (reassignEntry) {
                        reassignMutation.mutate({
                          entryId: reassignEntry.id,
                          targetBarberId: b.barber_id,
                        });
                      }
                    }}
                  />
                ))}
            </View>
          )}
        </BottomSheet>

        {/* Request Cancel Confirmation Dialog */}
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
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  shiftActionsGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  flexItem: {
    flex: 1,
  },
  sectionBlock: {
    gap: spacing.md,
  },
  servingActionsCol: {
    gap: spacing.sm,
  },
  waitingActionsCol: {
    gap: spacing.sm,
  },
  rowGapSm: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  reorderGroup: {
    flexDirection: 'row',
    gap: 4,
  },
});
