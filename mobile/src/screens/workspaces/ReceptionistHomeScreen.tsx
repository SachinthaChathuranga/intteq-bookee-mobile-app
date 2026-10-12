import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { QueueEntry } from '../../api/barber';
import {
  assignGeneralCustomer,
  fetchBranchLiveFloor,
  type BarberFloorState,
} from '../../api/receptionist';
import { useQueueSocket } from '../../api/socket';
import { AppText } from '../../components/AppText';
import { useT } from '../../i18n';
import type { ReceptionistStackParamList } from '../../navigation/types';
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

type Props = NativeStackScreenProps<ReceptionistStackParamList, 'ReceptionistHome'>;

export function ReceptionistHomeScreen({ navigation }: Props) {
  const t = useT();
  const { colors } = useTheme();
  const queryClient = useQueryClient();

  const activeWorkspace = useWorkspaceStore((s) => s.activeWorkspace);
  const activeBranchId = useWorkspaceStore((s) => s.activeBranchId) ?? activeWorkspace?.branch_id;

  const [assigningEntry, setAssigningEntry] = useState<QueueEntry | null>(null);

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

  const stickyAction = activeBranchId ? (
    <Button
      variant="primary"
      label={`+ ${t('walkin.title')}`}
      onPress={() => {
        haptics.light();
        navigation.navigate('AddWalkIn', { branchId: activeBranchId });
      }}
    />
  ) : null;

  return (
    <Screen
      scrollable
      refreshing={floorQuery.isRefetching}
      onRefresh={() => floorQuery.refetch()}
      stickyFooter={stickyAction}
      contentContainerStyle={styles.container}
    >
      {/* Header with Title and Branch Name */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <AppText variant="caption" style={{ color: colors.textMuted, fontWeight: '700' }}>
            {activeWorkspace?.business_name ?? ''}
          </AppText>
          <AppText variant="title" style={styles.title}>
            {t('floor.title')}
          </AppText>
        </View>

        <Badge
          label={t('floor.barbersCount', { count: onShiftBarbers.length })}
          variant={onShiftBarbers.length > 0 ? 'success' : 'neutral'}
        />
      </View>

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

            {/* Queue count & action */}
            <View style={styles.barberFooterRow}>
              <AppText variant="caption" style={{ color: colors.textMuted }}>
                {barber.waiting.length} waiting • ~{barber.wait_time_minutes}m wait
              </AppText>

              {activeBranchId ? (
                <TouchableOpacity
                  onPress={() => {
                    haptics.light();
                    navigation.navigate('AddWalkIn', {
                      branchId: activeBranchId,
                      preselectedBarberId: barber.barber_id,
                    });
                  }}
                  activeOpacity={0.7}
                  style={[
                    styles.smallBtn,
                    { backgroundColor: colors.background, borderColor: colors.border },
                  ]}
                >
                  <Ionicons name="person-add-outline" size={14} color={colors.primary} />
                  <AppText variant="caption" style={{ color: colors.primary, fontWeight: '700' }}>
                    + {t('walkin.title')}
                  </AppText>
                </TouchableOpacity>
              ) : null}
            </View>
          </Card>
        ))
      )}

      {/* Assign Bottom Sheet */}
      {assigningEntry ? (
        <AssignCustomerBottomSheet
          visible={Boolean(assigningEntry)}
          entry={assigningEntry}
          barbers={onShiftBarbers}
          loading={assignMutation.isPending}
          onSelect={(barberId) =>
            assignMutation.mutate({
              entryId: assigningEntry.id,
              targetBarberId: barberId,
            })
          }
          onClose={() => setAssigningEntry(null)}
        />
      ) : null}
    </Screen>
  );
}

interface AssignSheetProps {
  visible: boolean;
  entry: QueueEntry;
  barbers: BarberFloorState[];
  loading: boolean;
  onSelect: (barberId: string) => void;
  onClose: () => void;
}

function AssignCustomerBottomSheet({
  visible,
  entry,
  barbers,
  loading,
  onSelect,
  onClose,
}: AssignSheetProps) {
  const t = useT();
  const { colors } = useTheme();

  return (
    <BottomSheet visible={visible} onClose={onClose} title={t('queue.reassignTitle')}>
      <View style={styles.sheetContent}>
        <View style={styles.entrySummary}>
          <AppText variant="bodyBold" style={{ fontSize: 16 }}>
            {entry.token_number ? `${entry.token_number} - ` : ''}
            {entry.walk_in_name || entry.customer_name || 'Walk-in Customer'}
          </AppText>
          <AppText variant="caption" style={{ color: colors.textMuted }}>
            {t('queue.reassignSubtitle')}
          </AppText>
        </View>

        <ScrollView style={{ maxHeight: 280 }} contentContainerStyle={{ gap: spacing.sm }}>
          {barbers.length === 0 ? (
            <AppText variant="caption" style={{ textAlign: 'center', paddingVertical: spacing.md }}>
              {t('floor.noBarbersOnShift')}
            </AppText>
          ) : (
            barbers.map((barber) => (
              <TouchableOpacity
                key={barber.barber_id}
                disabled={loading}
                activeOpacity={0.7}
                onPress={() => onSelect(barber.barber_id)}
                style={[
                  styles.assignOption,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Avatar name={barber.name || barber.phone} size="sm" />
                <View style={{ flex: 1, gap: 2 }}>
                  <AppText variant="bodyBold">
                    {barber.name || barber.phone}
                  </AppText>
                  <AppText variant="caption" style={{ color: colors.textMuted }}>
                    {barber.waiting.length} waiting • ~{barber.wait_time_minutes}m
                  </AppText>
                </View>
                <Badge
                  label={barber.shift_status}
                  variant={barber.shift_status === 'ACTIVE' ? 'success' : 'warning'}
                />
              </TouchableOpacity>
            ))
          )}
        </ScrollView>

        <Button variant="secondary" label={t('common.cancel')} onPress={onClose} disabled={loading} />
      </View>
    </BottomSheet>
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
  statsCard: {
    padding: spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statCol: {
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
  },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  tokenBox: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.input,
    borderWidth: 1.5,
    minWidth: 54,
    alignItems: 'center',
  },
  tokenText: {
    fontSize: 16,
    fontWeight: '800',
  },
  assignBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
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
  smallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  sheetContent: {
    gap: spacing.md,
    paddingBottom: spacing.sm,
  },
  entrySummary: {
    gap: 4,
  },
  assignOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.card,
    borderWidth: 1,
    minHeight: 52,
  },
});
