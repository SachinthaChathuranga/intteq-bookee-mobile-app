import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Alert, StyleSheet, TouchableOpacity, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  callNextCustomer,
  completeService,
  devEnqueueCustomer,
  fetchBarberQueue,
  fetchCurrentShift,
  markNoShow,
  pauseShift,
  reorderQueue,
  resumeShift,
  startShift,
  type CompleteServiceInput,
  type QueueEntry,
} from '../../api/barber';
import { fetchServices } from '../../api/owner';
import { useQueueSocket } from '../../api/socket';
import { AppText } from '../../components/AppText';
import { useT } from '../../i18n';
import type { BarberStackParamList } from '../../navigation/types';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { useTheme } from '../../theme/ThemeProvider';
import {
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  Screen,
  SkeletonCard,
  SkeletonListItem,
  haptics,
  radius,
  spacing,
} from '../../ui';
import { formatCurrency } from '../../utils/format';
import { CompleteServiceModal } from './CompleteServiceModal';

type Props = NativeStackScreenProps<BarberStackParamList, 'BarberHome'>;

export function BarberHomeScreen({ navigation }: Props) {
  const t = useT();
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const activeWorkspace = useWorkspaceStore((s) => s.activeWorkspace);
  const activeBranchId = useWorkspaceStore((s) => s.activeBranchId) ?? activeWorkspace?.branch_id;

  const [completingEntry, setCompletingEntry] = useState<QueueEntry | null>(null);

  // Real-time WebSocket connection
  useQueueSocket(activeBranchId);

  const shiftQuery = useQuery({
    queryKey: ['barber-shift', activeBranchId],
    queryFn: () => fetchCurrentShift(activeBranchId!),
    enabled: Boolean(activeBranchId),
  });

  const queueQuery = useQuery({
    queryKey: ['barber-queue', activeBranchId],
    queryFn: () => fetchBarberQueue(activeBranchId!),
    enabled: Boolean(activeBranchId),
  });

  const servicesQuery = useQuery({
    queryKey: ['services', activeBranchId],
    queryFn: () => fetchServices(activeBranchId!),
    enabled: Boolean(activeBranchId),
  });

  const shift = shiftQuery.data?.shift;
  const isShiftActive = shift?.status === 'ACTIVE';
  const isShiftPaused = shift?.status === 'PAUSED';
  const hasShift = isShiftActive || isShiftPaused;

  const serving = queueQuery.data?.serving;
  const waitingList = queueQuery.data?.waiting ?? [];
  const generalCount = queueQuery.data?.generalCount ?? 0;

  // Shift Mutations
  const startShiftMutation = useMutation({
    mutationFn: () => startShift(activeBranchId!),
    onSuccess: () => {
      haptics.success();
      queryClient.invalidateQueries({ queryKey: ['barber-shift', activeBranchId] });
    },
    onError: () => Alert.alert('Error', t('common.error.generic')),
  });

  const pauseShiftMutation = useMutation({
    mutationFn: () => pauseShift(activeBranchId!),
    onSuccess: () => {
      haptics.light();
      queryClient.invalidateQueries({ queryKey: ['barber-shift', activeBranchId] });
    },
    onError: () => Alert.alert('Error', t('common.error.generic')),
  });

  const resumeShiftMutation = useMutation({
    mutationFn: () => resumeShift(activeBranchId!),
    onSuccess: () => {
      haptics.light();
      queryClient.invalidateQueries({ queryKey: ['barber-shift', activeBranchId] });
    },
    onError: () => Alert.alert('Error', t('common.error.generic')),
  });

  // Queue Mutations
  const callNextMutation = useMutation({
    mutationFn: () => callNextCustomer(activeBranchId!),
    onSuccess: () => {
      haptics.success();
      queryClient.invalidateQueries({ queryKey: ['barber-queue', activeBranchId] });
    },
    onError: () => Alert.alert('Error', t('common.error.generic')),
  });

  const noShowMutation = useMutation({
    mutationFn: (entryId: string) => markNoShow(activeBranchId!, entryId),
    onSuccess: () => {
      haptics.medium();
      queryClient.invalidateQueries({ queryKey: ['barber-queue', activeBranchId] });
    },
    onError: () => Alert.alert('Error', t('common.error.generic')),
  });

  const completeMutation = useMutation({
    mutationFn: ({ entryId, data }: { entryId: string; data: CompleteServiceInput }) =>
      completeService(activeBranchId!, entryId, data),
    onSuccess: () => {
      haptics.success();
      setCompletingEntry(null);
      queryClient.invalidateQueries({ queryKey: ['barber-queue', activeBranchId] });
      queryClient.invalidateQueries({ queryKey: ['barber-shift', activeBranchId] });
    },
    onError: () => Alert.alert('Error', t('common.error.generic')),
  });

  const reorderMutation = useMutation({
    mutationFn: (entryIds: string[]) => reorderQueue(activeBranchId!, entryIds),
    onSuccess: () => {
      haptics.light();
      queryClient.invalidateQueries({ queryKey: ['barber-queue', activeBranchId] });
    },
  });

  const devEnqueueMutation = useMutation({
    mutationFn: () => {
      const allServices = servicesQuery.data ?? [];
      const serviceIds = allServices.length > 0 ? [allServices[0].id] : [];
      return devEnqueueCustomer(activeBranchId!, {
        customerName: `Walk-in #${waitingList.length + 1}`,
        serviceIds,
        barberId: activeWorkspace?.id,
      });
    },
    onSuccess: () => {
      haptics.light();
      queryClient.invalidateQueries({ queryKey: ['barber-queue', activeBranchId] });
    },
  });

  const moveItem = (index: number, direction: 'up' | 'down') => {
    const newIdx = direction === 'up' ? index - 1 : index + 1;
    if (newIdx < 0 || newIdx >= waitingList.length) return;

    const items = [...waitingList];
    const temp = items[index];
    items[index] = items[newIdx];
    items[newIdx] = temp;

    reorderMutation.mutate(items.map((i) => i.id));
  };

  const handleEndShiftPress = () => {
    if (!shift) return;
    navigation.navigate('EndShift', { branchId: activeBranchId!, shiftId: shift.id });
  };

  if (!activeBranchId) {
    return (
      <Screen>
        <EmptyState
          icon="business-outline"
          title="No Branch Assigned"
          description="Ask your salon owner to assign you to a branch."
        />
      </Screen>
    );
  }

  // Determine Sticky Action
  let stickyAction = null;
  if (serving) {
    stickyAction = (
      <Button
        variant="primary"
        label={t('queue.completeService')}
        onPress={() => setCompletingEntry(serving)}
      />
    );
  } else if (!hasShift) {
    stickyAction = (
      <Button
        variant="primary"
        label={t('shift.start')}
        onPress={() => startShiftMutation.mutate()}
        loading={startShiftMutation.isPending}
      />
    );
  } else if (isShiftActive) {
    const canCall = waitingList.length > 0 || generalCount > 0;
    stickyAction = (
      <Button
        variant="primary"
        label={t('queue.callNext')}
        disabled={!canCall}
        onPress={() => callNextMutation.mutate()}
        loading={callNextMutation.isPending}
      />
    );
  }

  return (
    <Screen
      scrollable
      refreshing={queueQuery.isRefetching || shiftQuery.isRefetching}
      onRefresh={() => {
        queueQuery.refetch();
        shiftQuery.refetch();
      }}
      stickyFooter={stickyAction}
      contentContainerStyle={styles.container}
    >
      {/* Screen Header with Large Title */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <AppText variant="caption" style={{ color: colors.textMuted, fontWeight: '700' }}>
            {activeWorkspace?.business_name ?? t('workspace.barber.title')}
          </AppText>
          <AppText variant="title" style={styles.title}>
            {t('nav.queue')}
          </AppText>
        </View>

        <Badge
          label={
            isShiftActive
              ? t('shift.active')
              : isShiftPaused
              ? t('shift.paused')
              : t('shift.ended')
          }
          variant={isShiftActive ? 'success' : isShiftPaused ? 'warning' : 'neutral'}
        />
      </View>

      {/* Shift Overview Bar */}
      <Card style={styles.shiftCard}>
        <View style={styles.shiftHeader}>
          <View style={{ gap: 2 }}>
            <AppText variant="caption" style={{ color: colors.textMuted }}>
              {t('shift.duration')}
            </AppText>
            <AppText variant="heading" style={{ fontSize: 18 }}>
              {hasShift ? `${shiftQuery.data?.summary?.duration_minutes ?? 0} mins` : '—'}
            </AppText>
          </View>

          {hasShift ? (
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              {isShiftActive ? (
                <Button
                  variant="secondary"
                  size="small"
                  label={t('shift.pause')}
                  onPress={() => pauseShiftMutation.mutate()}
                  loading={pauseShiftMutation.isPending}
                />
              ) : (
                <Button
                  variant="primary"
                  size="small"
                  label={t('shift.resume')}
                  onPress={() => resumeShiftMutation.mutate()}
                  loading={resumeShiftMutation.isPending}
                />
              )}
              <Button
                variant="ghost"
                size="small"
                label={t('shift.end')}
                onPress={handleEndShiftPress}
              />
            </View>
          ) : null}
        </View>
      </Card>

      {/* Currently Serving Section */}
      {serving ? (
        <Card style={[styles.servingCard, { borderColor: colors.primary }]}>
          <View style={styles.servingHeader}>
            <Badge label={t('queue.currentlyServing')} variant="primary" />
            <AppText variant="bodyBold" style={{ color: colors.primary }}>
              {formatCurrency(serving.total_price)}
            </AppText>
          </View>

          <View style={styles.customerRow}>
            <Avatar name={serving.walk_in_name || serving.customer_name || 'Customer'} size="lg" />
            <View style={{ flex: 1, gap: 4 }}>
              <AppText variant="heading" style={{ fontSize: 20 }}>
                {serving.walk_in_name || serving.customer_name || serving.token_number}
              </AppText>
              <AppText variant="caption" style={{ color: colors.textMuted }}>
                {serving.services.map((s) => `${s.name} (${s.duration_minutes}m)`).join(', ')}
              </AppText>
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.xs }}>
            <View style={{ flex: 1 }}>
              <Button
                variant="secondary"
                label={t('queue.noShow')}
                onPress={() => noShowMutation.mutate(serving.id)}
                loading={noShowMutation.isPending}
              />
            </View>
          </View>
        </Card>
      ) : null}

      {/* My Waiting Queue */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <AppText variant="heading" style={{ fontSize: 18 }}>
              {t('queue.waitingTitle')}
            </AppText>
            <Badge label={String(waitingList.length)} variant="primary" />
          </View>

          {/* Dev Test Enqueuer */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => devEnqueueMutation.mutate()}
            style={[styles.devBtn, { borderColor: colors.border }]}
          >
            <AppText variant="caption" style={{ color: colors.primary, fontWeight: '700' }}>
              + Test Customer
            </AppText>
          </TouchableOpacity>
        </View>

        {queueQuery.isLoading ? (
          <View style={{ gap: spacing.md }}>
            <SkeletonListItem />
            <SkeletonListItem />
          </View>
        ) : waitingList.length === 0 ? (
          <Card>
            <AppText variant="body" style={{ textAlign: 'center', fontWeight: '600' }}>
              {t('queue.empty')}
            </AppText>
            {generalCount > 0 ? (
              <AppText
                variant="caption"
                style={{ textAlign: 'center', marginTop: 4, color: colors.primary, fontWeight: '600' }}
              >
                {t('queue.generalAvailable', { count: generalCount })}
              </AppText>
            ) : null}
          </Card>
        ) : (
          waitingList.map((item, index) => {
            const name = item.walk_in_name || item.customer_name || item.token_number;

            return (
              <Card key={item.id}>
                <View style={styles.waitingRow}>
                  <View style={[styles.indexPill, { backgroundColor: colors.background }]}>
                    <AppText style={[styles.indexText, { color: colors.primary }]}>
                      #{index + 1}
                    </AppText>
                  </View>

                  <Avatar name={name} size="md" />

                  <View style={{ flex: 1, gap: 2 }}>
                    <AppText variant="bodyBold">
                      {name}
                    </AppText>
                    <AppText variant="caption" style={{ color: colors.textMuted }}>
                      {item.services.map((s) => s.name).join(', ')} • {formatCurrency(item.total_price)}
                    </AppText>
                  </View>

                  {/* Reorder Controls */}
                  <View style={styles.reorderCol}>
                    <TouchableOpacity
                      disabled={index === 0}
                      onPress={() => moveItem(index, 'up')}
                      style={[
                        styles.arrowBtn,
                        { opacity: index === 0 ? 0.3 : 1, borderColor: colors.border },
                      ]}
                    >
                      <Ionicons name="chevron-up" size={16} color={colors.text} />
                    </TouchableOpacity>

                    <TouchableOpacity
                      disabled={index === waitingList.length - 1}
                      onPress={() => moveItem(index, 'down')}
                      style={[
                        styles.arrowBtn,
                        {
                          opacity: index === waitingList.length - 1 ? 0.3 : 1,
                          borderColor: colors.border,
                        },
                      ]}
                    >
                      <Ionicons name="chevron-down" size={16} color={colors.text} />
                    </TouchableOpacity>
                  </View>
                </View>
              </Card>
            );
          })
        )}
      </View>

      {/* Completion Bottom Sheet */}
      <CompleteServiceModal
        visible={Boolean(completingEntry)}
        entry={completingEntry}
        onClose={() => setCompletingEntry(null)}
        onSubmit={(data) => {
          if (completingEntry) {
            completeMutation.mutate({ entryId: completingEntry.id, data });
          }
        }}
        loading={completeMutation.isPending}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  shiftCard: {
    padding: spacing.md,
  },
  shiftHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  servingCard: {
    borderWidth: 2,
    gap: spacing.md,
  },
  servingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  section: {
    gap: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  devBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  waitingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  indexPill: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indexText: {
    fontWeight: '800',
    fontSize: 13,
  },
  reorderCol: {
    flexDirection: 'row',
    gap: 4,
  },
  arrowBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
