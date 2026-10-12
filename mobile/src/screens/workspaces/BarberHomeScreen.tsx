import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Alert, FlatList, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
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
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Screen } from '../../components/Screen';
import { useT } from '../../i18n';
import { WorkspaceHeader } from '../../navigation/workspaces/WorkspaceHeader';
import type { BarberStackParamList } from '../../navigation/types';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { useTheme } from '../../theme/ThemeProvider';
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
      queryClient.invalidateQueries({ queryKey: ['barber-shift', activeBranchId] });
    },
    onError: () => Alert.alert('Error', t('common.error.generic')),
  });

  const pauseShiftMutation = useMutation({
    mutationFn: () => pauseShift(activeBranchId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['barber-shift', activeBranchId] });
    },
    onError: () => Alert.alert('Error', t('common.error.generic')),
  });

  const resumeShiftMutation = useMutation({
    mutationFn: () => resumeShift(activeBranchId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['barber-shift', activeBranchId] });
    },
    onError: () => Alert.alert('Error', t('common.error.generic')),
  });

  // Queue Mutations
  const callNextMutation = useMutation({
    mutationFn: () => callNextCustomer(activeBranchId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['barber-queue', activeBranchId] });
    },
    onError: () => Alert.alert('Error', t('common.error.generic')),
  });

  const noShowMutation = useMutation({
    mutationFn: (entryId: string) => markNoShow(activeBranchId!, entryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['barber-queue', activeBranchId] });
    },
    onError: () => Alert.alert('Error', t('common.error.generic')),
  });

  const completeMutation = useMutation({
    mutationFn: ({ entryId, data }: { entryId: string; data: CompleteServiceInput }) =>
      completeService(activeBranchId!, entryId, data),
    onSuccess: () => {
      setCompletingEntry(null);
      queryClient.invalidateQueries({ queryKey: ['barber-queue', activeBranchId] });
      queryClient.invalidateQueries({ queryKey: ['barber-shift', activeBranchId] });
    },
    onError: () => Alert.alert('Error', t('common.error.generic')),
  });

  const reorderMutation = useMutation({
    mutationFn: (entryIds: string[]) => reorderQueue(activeBranchId!, entryIds),
    onSuccess: () => {
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
      <View style={{ flex: 1 }}>
        <WorkspaceHeader title={t('workspace.barber.title')} />
        <Screen>
          <Card>
            <AppText variant="body" style={{ textAlign: 'center' }}>
              No branch assigned.
            </AppText>
          </Card>
        </Screen>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <WorkspaceHeader title={t('workspace.barber.title')} />
      <Screen>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Shift Bar Card */}
          <Card>
            <View style={styles.shiftHeader}>
              <View style={{ gap: 2 }}>
                <AppText variant="caption">{t('shift.duration')}</AppText>
                <AppText variant="body" style={{ fontWeight: '700' }}>
                  {hasShift ? `${shiftQuery.data?.summary?.duration_minutes ?? 0} mins` : '—'}
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
                variant={isShiftActive ? 'success' : isShiftPaused ? 'warning' : 'primary'}
              />
            </View>

            <View style={styles.shiftActions}>
              {!hasShift ? (
                <Button
                  label={t('shift.start')}
                  onPress={() => startShiftMutation.mutate()}
                  loading={startShiftMutation.isPending}
                />
              ) : (
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    {isShiftActive ? (
                      <Button
                        variant="secondary"
                        label={t('shift.pause')}
                        onPress={() => pauseShiftMutation.mutate()}
                        loading={pauseShiftMutation.isPending}
                      />
                    ) : (
                      <Button
                        label={t('shift.resume')}
                        onPress={() => resumeShiftMutation.mutate()}
                        loading={resumeShiftMutation.isPending}
                      />
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Button
                      variant="secondary"
                      label={t('shift.end')}
                      onPress={handleEndShiftPress}
                    />
                  </View>
                </View>
              )}
            </View>
          </Card>

          {/* Currently Serving Section */}
          {serving ? (
            <Card style={{ borderColor: colors.primary, borderWidth: 1.5 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <AppText variant="caption" style={{ color: colors.primary, fontWeight: '700' }}>
                  {t('queue.currentlyServing')}
                </AppText>
                <AppText variant="body" style={{ fontWeight: '700' }}>
                  {formatCurrency(serving.total_price)}
                </AppText>
              </View>

              <AppText variant="title" style={{ fontSize: 22, marginTop: 4 }}>
                {serving.walk_in_name || serving.customer_name || serving.token_number}
              </AppText>
              <AppText variant="caption">
                {serving.services.map((s) => `${s.name} (${s.duration_minutes}m)`).join(', ')}
              </AppText>

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                <View style={{ flex: 2 }}>
                  <Button
                    label={t('queue.completeService')}
                    onPress={() => setCompletingEntry(serving)}
                  />
                </View>
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
          ) : (
            /* Call Next Action */
            <View>
              <Button
                label={t('queue.callNext')}
                disabled={!isShiftActive || (waitingList.length === 0 && generalCount === 0)}
                onPress={() => callNextMutation.mutate()}
                loading={callNextMutation.isPending}
              />
              {generalCount > 0 && waitingList.length === 0 && (
                <AppText
                  variant="caption"
                  style={{ textAlign: 'center', marginTop: 6, color: colors.primary }}
                >
                  {t('queue.generalAvailable', { count: generalCount })}
                </AppText>
              )}
            </View>
          )}

          {/* My Waiting Queue */}
          <View style={styles.section}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <AppText variant="body" style={{ fontWeight: '700' }}>
                {t('queue.waitingTitle')} ({waitingList.length})
              </AppText>

              {/* Dev customer enqueuer */}
              <TouchableOpacity onPress={() => devEnqueueMutation.mutate()}>
                <AppText variant="caption" style={{ color: colors.primary, fontWeight: '700' }}>
                  + Add Test Customer
                </AppText>
              </TouchableOpacity>
            </View>

            {waitingList.length === 0 ? (
              <Card>
                <AppText variant="caption" style={{ textAlign: 'center' }}>
                  {t('queue.empty')}
                </AppText>
              </Card>
            ) : (
              waitingList.map((item, index) => {
                const name = item.walk_in_name || item.customer_name || item.token_number;

                return (
                  <Card key={item.id}>
                    <View style={styles.waitingRow}>
                      <View style={{ flex: 1, gap: 2 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <AppText
                            variant="body"
                            style={{ fontWeight: '800', color: colors.primary }}
                          >
                            #{index + 1}
                          </AppText>
                          <AppText variant="body" style={{ fontWeight: '700' }}>
                            {name}
                          </AppText>
                        </View>
                        <AppText variant="caption">
                          {item.services.map((s) => s.name).join(', ')} • {formatCurrency(item.total_price)}
                        </AppText>
                      </View>

                      {/* Reorder Buttons */}
                      <View style={styles.reorderCol}>
                        <TouchableOpacity
                          disabled={index === 0}
                          onPress={() => moveItem(index, 'up')}
                          style={[
                            styles.arrowBtn,
                            { opacity: index === 0 ? 0.3 : 1, borderColor: colors.border },
                          ]}
                        >
                          <AppText style={{ fontSize: 16 }}>▲</AppText>
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
                          <AppText style={{ fontSize: 16 }}>▼</AppText>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </Card>
                );
              })
            )}
          </View>
        </ScrollView>
      </Screen>

      {/* Completion Modal */}
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
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    gap: 16,
    paddingBottom: 40,
  },
  section: {
    gap: 10,
  },
  shiftHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  shiftActions: {
    marginTop: 14,
  },
  waitingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  reorderCol: {
    flexDirection: 'row',
    gap: 6,
  },
  arrowBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
