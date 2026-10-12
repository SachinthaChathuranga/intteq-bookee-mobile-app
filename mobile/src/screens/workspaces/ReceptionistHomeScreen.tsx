import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import {
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { QueueEntry } from '../../api/barber';
import {
  assignGeneralCustomer,
  fetchBranchLiveFloor,
  type BarberFloorState,
} from '../../api/receptionist';
import { useQueueSocket } from '../../api/socket';
import { AppText } from '../../components/AppText';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Screen } from '../../components/Screen';
import { useT } from '../../i18n';
import type { ReceptionistStackParamList } from '../../navigation/types';
import { WorkspaceHeader } from '../../navigation/workspaces/WorkspaceHeader';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { useTheme } from '../../theme/ThemeProvider';

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
      <WorkspaceHeader title={t('floor.title')} />
      <Screen>
        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={
            <RefreshControl
              refreshing={floorQuery.isRefetching}
              onRefresh={() => floorQuery.refetch()}
            />
          }
        >
          {/* Floor Summary Stats */}
          <Card>
            <View style={styles.statsRow}>
              <View style={styles.statCol}>
                <AppText variant="caption" style={{ color: colors.textMuted }}>
                  {t('floor.totalWaiting', { count: '' }).replace(': ', '')}
                </AppText>
                <AppText variant="title" style={{ fontSize: 24, fontWeight: '700' }}>
                  {floorQuery.data?.total_waiting_count ?? 0}
                </AppText>
              </View>

              <View style={[styles.statDivider, { backgroundColor: colors.border }]} />

              <View style={styles.statCol}>
                <AppText variant="caption" style={{ color: colors.textMuted }}>
                  {t('role.BARBER')}
                </AppText>
                <AppText variant="title" style={{ fontSize: 24, fontWeight: '700' }}>
                  {floorQuery.data?.active_barbers_count ?? 0}
                </AppText>
              </View>
            </View>
          </Card>

          {/* Primary Action: Add Walk-in */}
          {activeBranchId ? (
            <Button
              label={`+ ${t('walkin.title')}`}
              onPress={() => navigation.navigate('AddWalkIn', { branchId: activeBranchId })}
            />
          ) : null}

          {/* General Queue Section */}
          <View style={styles.sectionHeader}>
            <AppText variant="body" style={{ fontWeight: '700', fontSize: 18 }}>
              {t('floor.generalQueue')}
            </AppText>
            <Badge
              label={String(floorQuery.data?.general_queue.length ?? 0)}
              variant="primary"
            />
          </View>

          {floorQuery.data?.general_queue.length === 0 ? (
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

                  <View style={{ flex: 1, gap: 4 }}>
                    <AppText variant="body" style={{ fontWeight: '700' }}>
                      {entry.walk_in_name || entry.customer_name || 'Walk-in'}
                    </AppText>
                    <AppText variant="caption" style={{ color: colors.textMuted }}>
                      {entry.services.map((s) => s.name).join(', ') || 'Standard Cut'}
                    </AppText>
                  </View>

                  <TouchableOpacity
                    onPress={() => setAssigningEntry(entry)}
                    style={[
                      styles.assignBtn,
                      {
                        backgroundColor: colors.background,
                        borderColor: colors.border,
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
            <AppText variant="body" style={{ fontWeight: '700', fontSize: 18 }}>
              {t('floor.activeBarbers')}
            </AppText>
            <Badge
              label={t('floor.barbersCount', { count: onShiftBarbers.length })}
              variant="success"
            />
          </View>

          {onShiftBarbers.length === 0 ? (
            <Card>
              <AppText variant="caption" style={{ textAlign: 'center' }}>
                {t('floor.noBarbersOnShift')}
              </AppText>
            </Card>
          ) : (
            onShiftBarbers.map((barber) => (
              <Card key={barber.barber_id}>
                <View style={styles.barberCardHeader}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <AppText variant="body" style={{ fontWeight: '700' }}>
                      {barber.name || barber.phone}
                    </AppText>
                    <AppText variant="caption" style={{ color: colors.textMuted }}>
                      {barber.phone}
                    </AppText>
                  </View>
                  <Badge
                    label={barber.shift_status}
                    variant={barber.shift_status === 'ACTIVE' ? 'success' : 'warning'}
                  />
                </View>

                {/* Serving state */}
                <View style={[styles.barberStatusBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  {barber.serving ? (
                    <View style={{ gap: 2 }}>
                      <AppText variant="caption" style={{ color: colors.textMuted }}>
                        {t('floor.servingNow', {
                          name: `${barber.serving.token_number || ''} ${
                            barber.serving.walk_in_name || barber.serving.customer_name || ''
                          }`.trim(),
                        })}
                      </AppText>
                      <AppText variant="caption" style={{ fontWeight: '600' }}>
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
                  <View style={{ gap: 2 }}>
                    <AppText variant="caption" style={{ color: colors.textMuted }}>
                      {barber.waiting.length} waiting • ~{barber.wait_time_minutes}m wait
                    </AppText>
                  </View>

                  {activeBranchId ? (
                    <TouchableOpacity
                      onPress={() =>
                        navigation.navigate('AddWalkIn', {
                          branchId: activeBranchId,
                          preselectedBarberId: barber.barber_id,
                        })
                      }
                      style={[styles.smallBtn, { backgroundColor: colors.background, borderColor: colors.border }]}
                    >
                      <AppText variant="caption" style={{ color: colors.primary, fontWeight: '600' }}>
                        + {t('walkin.title')}
                      </AppText>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </Card>
            ))
          )}
        </ScrollView>
      </Screen>

      {/* Assign Modal */}
      {assigningEntry ? (
        <AssignCustomerModal
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
    </View>
  );
}

interface AssignModalProps {
  visible: boolean;
  entry: QueueEntry;
  barbers: BarberFloorState[];
  loading: boolean;
  onSelect: (barberId: string) => void;
  onClose: () => void;
}

function AssignCustomerModal({
  visible,
  entry,
  barbers,
  loading,
  onSelect,
  onClose,
}: AssignModalProps) {
  const t = useT();
  const { colors } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={[styles.modalBackdrop, { backgroundColor: colors.overlay }]}>
        <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <AppText variant="title" style={{ fontSize: 20 }}>
            {t('queue.reassignTitle')}
          </AppText>
          <AppText variant="body" style={{ fontWeight: '600' }}>
            {entry.token_number ? `${entry.token_number} - ` : ''}
            {entry.walk_in_name || entry.customer_name || 'Walk-in Customer'}
          </AppText>
          <AppText variant="caption" style={{ color: colors.textMuted }}>
            {t('queue.reassignSubtitle')}
          </AppText>

          <ScrollView style={{ maxHeight: 300 }} contentContainerStyle={{ gap: 8, paddingVertical: 8 }}>
            {barbers.length === 0 ? (
              <AppText variant="caption" style={{ textAlign: 'center' }}>
                {t('floor.noBarbersOnShift')}
              </AppText>
            ) : (
              barbers.map((barber) => (
                <TouchableOpacity
                  key={barber.barber_id}
                  disabled={loading}
                  onPress={() => onSelect(barber.barber_id)}
                  style={[
                    styles.assignOption,
                    {
                      backgroundColor: colors.background,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <View style={{ flex: 1, gap: 2 }}>
                    <AppText variant="body" style={{ fontWeight: '600' }}>
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
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: 40,
    gap: 16,
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
    marginTop: 8,
  },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  tokenBox: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
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
    borderRadius: 8,
    borderWidth: 1,
  },
  barberCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  barberStatusBox: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 10,
  },
  barberFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  smallBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    gap: 12,
  },
  assignOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
});
