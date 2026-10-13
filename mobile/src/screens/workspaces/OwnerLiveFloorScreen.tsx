import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { QueueEntry } from '../../api/barber';
import { fetchBranches } from '../../api/owner';
import {
  assignGeneralCustomer,
  fetchBranchLiveFloor,
} from '../../api/receptionist';
import { useQueueSocket } from '../../api/socket';
import { AppText } from '../../components/AppText';
import { useT } from '../../i18n';
import type { OwnerStackParamList } from '../../navigation/types';
import { WorkspaceHeader } from '../../navigation/workspaces/WorkspaceHeader';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { useTheme } from '../../theme/ThemeProvider';
import {
  Avatar,
  Badge,
  BottomSheet,
  Button,
  Card,
  EmptyState,
  Screen,
  SkeletonCard,
  haptics,
  radius,
  spacing,
} from '../../ui';

type Props = NativeStackScreenProps<OwnerStackParamList, 'LiveFloor'>;

export function OwnerLiveFloorScreen({ navigation }: Props) {
  const t = useT();
  const { colors } = useTheme();
  const queryClient = useQueryClient();

  const activeBranchId = useWorkspaceStore((s) => s.activeBranchId);
  const setActiveBranchId = useWorkspaceStore((s) => s.setActiveBranchId);

  const [assigningEntry, setAssigningEntry] = useState<QueueEntry | null>(null);

  // Branches list for branch selector
  const branchesQuery = useQuery({
    queryKey: ['branches'],
    queryFn: fetchBranches,
  });

  const branches = branchesQuery.data ?? [];

  useEffect(() => {
    if (branches.length > 0 && (!activeBranchId || !branches.some((b) => b.id === activeBranchId))) {
      setActiveBranchId(branches[0].id);
    }
  }, [branches, activeBranchId, setActiveBranchId]);

  // Real-time WebSocket connection
  useQueueSocket(activeBranchId);

  const floorQuery = useQuery({
    queryKey: ['live-floor', activeBranchId],
    queryFn: () => fetchBranchLiveFloor(activeBranchId!),
    enabled: Boolean(activeBranchId),
    refetchInterval: 10000,
  });

  const assignMutation = useMutation({
    mutationFn: ({
      entryId,
      targetBarberId,
    }: {
      entryId: string;
      targetBarberId: string;
    }) => assignGeneralCustomer(activeBranchId!, entryId, targetBarberId),
    onSuccess: () => {
      haptics.success();
      queryClient.invalidateQueries({ queryKey: ['live-floor', activeBranchId] });
      queryClient.invalidateQueries({ queryKey: ['barber-queue', activeBranchId] });
      setAssigningEntry(null);
    },
  });

  const onShiftBarbers = (floorQuery.data?.barbers ?? []).filter(
    (b) => b.shift_status === 'ACTIVE' || b.shift_status === 'PAUSED',
  );

  return (
    <View style={{ flex: 1 }}>
      <WorkspaceHeader title={t('nav.floor')} />

      <Screen
        scrollable
        refreshing={floorQuery.isRefetching}
        onRefresh={() => floorQuery.refetch()}
        contentContainerStyle={styles.container}
      >
        {/* Branch Selector Chips (if multiple branches) */}
        {branches.length > 1 && (
          <View style={styles.branchSelectorSection}>
            <AppText variant="caption" style={{ color: colors.textMuted, fontWeight: '700' }}>
              {t('owner.activeBranch')}
            </AppText>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.branchChipsRow}
            >
              {branches.map((b) => {
                const isSelected = b.id === activeBranchId;
                return (
                  <TouchableOpacity
                    key={b.id}
                    onPress={() => {
                      haptics.selection();
                      setActiveBranchId(b.id);
                    }}
                    style={[
                      styles.branchChip,
                      {
                        backgroundColor: isSelected ? colors.primary : colors.surface,
                        borderColor: isSelected ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Ionicons
                      name="location-sharp"
                      size={14}
                      color={isSelected ? colors.onPrimary : colors.primary}
                    />
                    <AppText
                      variant="caption"
                      style={{
                        color: isSelected ? colors.onPrimary : colors.text,
                        fontWeight: '700',
                      }}
                    >
                      {b.name}
                    </AppText>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Floor Summary Stats */}
        <Card style={styles.statsCard}>
          <View style={styles.statsRow}>
            <View style={styles.statCol}>
              <AppText variant="caption" style={{ color: colors.textMuted }}>
                {t('floor.totalWaiting', { count: '' }).replace(': ', '')}
              </AppText>
              <AppText variant="title" style={{ fontSize: 26, fontWeight: '800' }}>
                {floorQuery.data?.total_waiting_count ?? 0}
              </AppText>
            </View>

            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />

            <View style={styles.statCol}>
              <AppText variant="caption" style={{ color: colors.textMuted }}>
                {t('floor.activeBarbers')}
              </AppText>
              <AppText variant="title" style={{ fontSize: 26, fontWeight: '800' }}>
                {floorQuery.data?.active_barbers_count ?? 0}
              </AppText>
            </View>
          </View>
        </Card>

        {/* General Queue Section */}
        <View style={styles.sectionHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <AppText variant="heading" style={{ fontSize: 18 }}>
              {t('floor.generalQueue')}
            </AppText>
            <Badge
              label={String(floorQuery.data?.general_queue.length ?? 0)}
              variant="primary"
            />
          </View>
        </View>

        {floorQuery.isLoading ? (
          <SkeletonCard height={120} />
        ) : floorQuery.data?.general_queue.length === 0 ? (
          <Card>
            <AppText variant="caption" style={{ textAlign: 'center' }}>
              {t('floor.noGeneralQueue')}
            </AppText>
          </Card>
        ) : (
          (floorQuery.data?.general_queue ?? []).map((entry) => (
            <Card key={entry.id}>
              <View style={styles.entryRow}>
                <View style={[styles.tokenBox, { backgroundColor: colors.background, borderColor: colors.primary }]}>
                  <AppText style={[styles.tokenText, { color: colors.primary }]}>
                    {entry.token_number || '—'}
                  </AppText>
                </View>

                <View style={{ flex: 1, gap: 2 }}>
                  <AppText variant="bodyBold">
                    {entry.walk_in_name || entry.customer_name || 'Walk-in'}
                  </AppText>
                  <AppText variant="caption" style={{ color: colors.textMuted }}>
                    {entry.services.map((s) => s.name).join(', ') || 'Standard Cut'}
                  </AppText>
                </View>

                <TouchableOpacity
                  onPress={() => {
                    haptics.light();
                    setAssigningEntry(entry);
                  }}
                  activeOpacity={0.7}
                  style={[
                    styles.assignBtn,
                    {
                      backgroundColor: colors.background,
                      borderColor: colors.primary,
                    },
                  ]}
                >
                  <AppText variant="caption" style={{ color: colors.primary, fontWeight: '700' }}>
                    {t('floor.assignTo')}
                  </AppText>
                </TouchableOpacity>
              </View>
            </Card>
          ))
        )}

        {/* Active Barbers Section */}
        <View style={styles.sectionHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <AppText variant="heading" style={{ fontSize: 18 }}>
              {t('floor.activeBarbers')}
            </AppText>
            <Badge
              label={t('floor.barbersCount', { count: onShiftBarbers.length })}
              variant="success"
            />
          </View>
        </View>

        {floorQuery.isLoading ? (
          <View style={{ gap: spacing.md }}>
            <SkeletonCard height={140} />
            <SkeletonCard height={140} />
          </View>
        ) : onShiftBarbers.length === 0 ? (
          <Card>
            <AppText variant="caption" style={{ textAlign: 'center' }}>
              {t('floor.noBarbersOnShift')}
            </AppText>
          </Card>
        ) : (
          onShiftBarbers.map((barber) => (
            <Card key={barber.barber_id} style={{ gap: spacing.sm }}>
              <View style={styles.barberCardHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                  <Avatar
                    name={barber.name || barber.phone}
                    size="md"
                    status={barber.shift_status === 'ACTIVE' ? 'active' : 'busy'}
                  />
                  <View style={{ gap: 2 }}>
                    <AppText variant="bodyBold">
                      {barber.name || barber.phone}
                    </AppText>
                    <AppText variant="caption" style={{ color: colors.textMuted }}>
                      {barber.phone}
                    </AppText>
                  </View>
                </View>

                <Badge
                  label={barber.shift_status}
                  variant={barber.shift_status === 'ACTIVE' ? 'success' : 'warning'}
                />
              </View>

              {/* Serving state */}
              <View
                style={[
                  styles.barberStatusBox,
                  { backgroundColor: colors.background, borderColor: colors.border },
                ]}
              >
                {barber.serving ? (
                  <View style={{ gap: 2 }}>
                    <AppText variant="caption" style={{ color: colors.textMuted }}>
                      {t('floor.servingNow', {
                        name: `${barber.serving.token_number || ''} ${
                          barber.serving.walk_in_name || barber.serving.customer_name || ''
                        }`.trim(),
                      })}
                    </AppText>
                    <AppText variant="caption" style={{ fontWeight: '700' }}>
                      {barber.serving.services.map((s) => s.name).join(', ')}
                    </AppText>
                  </View>
                ) : (
                  <AppText variant="caption" style={{ color: colors.textMuted }}>
                    Idle (No customer currently called)
                  </AppText>
                )}
              </View>

              {/* Queue count & summary */}
              <View style={styles.barberFooterRow}>
                <AppText variant="caption" style={{ color: colors.textMuted }}>
                  {barber.waiting.length} waiting • ~{barber.wait_time_minutes}m wait
                </AppText>
              </View>
            </Card>
          ))
        )}

        {/* Assign Bottom Sheet */}
        {assigningEntry ? (
          <BottomSheet
            visible={true}
            onClose={() => setAssigningEntry(null)}
            title={t('queue.reassignTitle')}
          >
            <View style={{ padding: spacing.md, gap: spacing.md }}>
              <View style={styles.sheetCustomerSummary}>
                <AppText variant="caption" style={{ color: colors.textMuted }}>
                  {t('queue.currentlyServing')}
                </AppText>
                <AppText variant="heading" style={{ fontSize: 18 }}>
                  {assigningEntry.walk_in_name || assigningEntry.customer_name || 'Walk-in'} (
                  {assigningEntry.token_number || '—'})
                </AppText>
                <AppText variant="caption" style={{ color: colors.primary, fontWeight: '700' }}>
                  {assigningEntry.services.map((s) => s.name).join(', ')}
                </AppText>
              </View>

              <AppText variant="bodyBold" style={{ marginTop: spacing.xs }}>
                {t('queue.reassignSubtitle')}
              </AppText>

              {onShiftBarbers.length === 0 ? (
                <EmptyState
                  icon="people-outline"
                  title={t('floor.noBarbersOnShift')}
                  description={t('floor.noBarbersOnShift')}
                />
              ) : (
                onShiftBarbers.map((b) => (
                  <TouchableOpacity
                    key={b.barber_id}
                    onPress={() => {
                      haptics.selection();
                      assignMutation.mutate({
                        entryId: assigningEntry.id,
                        targetBarberId: b.barber_id,
                      });
                    }}
                    disabled={assignMutation.isPending}
                    style={[
                      styles.sheetBarberItem,
                      {
                        backgroundColor: colors.surface,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <Avatar name={b.name || b.phone} size="sm" />
                    <View style={{ flex: 1 }}>
                      <AppText variant="bodyBold">{b.name || b.phone}</AppText>
                      <AppText variant="caption" style={{ color: colors.textMuted }}>
                        {b.waiting.length} waiting • ~{b.wait_time_minutes}m wait
                      </AppText>
                    </View>
                    <Ionicons name="arrow-forward" size={18} color={colors.primary} />
                  </TouchableOpacity>
                ))
              )}
            </View>
          </BottomSheet>
        ) : null}
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    gap: spacing.lg,
    paddingBottom: 40,
  },
  branchSelectorSection: {
    gap: spacing.xs,
  },
  branchChipsRow: {
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  branchChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.card,
    borderWidth: 1,
  },
  statsCard: {
    padding: spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statCol: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statDivider: {
    width: 1,
    height: 40,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  tokenBox: {
    width: 44,
    height: 44,
    borderRadius: radius.card,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tokenText: {
    fontSize: 14,
    fontWeight: '800',
  },
  assignBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.input,
    borderWidth: 1,
  },
  barberCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  barberStatusBox: {
    padding: spacing.sm,
    borderRadius: radius.input,
    borderWidth: 1,
  },
  barberFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sheetCustomerSummary: {
    gap: 4,
    paddingBottom: spacing.sm,
  },
  sheetBarberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.card,
    borderWidth: 1,
  },
});
