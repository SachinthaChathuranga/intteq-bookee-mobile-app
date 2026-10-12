import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, FlatList, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  autoReassignAll,
  endShift,
  fetchBarberQueue,
  fetchCurrentShift,
  markCustomerLeft,
  reassignCustomer,
  type QueueEntry,
} from '../../api/barber';
import { AppText } from '../../components/AppText';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Screen } from '../../components/Screen';
import { useT } from '../../i18n';
import { WorkspaceHeader } from '../../navigation/workspaces/WorkspaceHeader';
import type { BarberStackParamList } from '../../navigation/types';
import { useTheme } from '../../theme/ThemeProvider';
import { formatCurrency } from '../../utils/format';

type Props = NativeStackScreenProps<BarberStackParamList, 'EndShift'>;

export function EndShiftScreen({ route, navigation }: Props) {
  const t = useT();
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const { branchId } = route.params;

  const queueQuery = useQuery({
    queryKey: ['barber-queue', branchId],
    queryFn: () => fetchBarberQueue(branchId),
  });

  const shiftQuery = useQuery({
    queryKey: ['barber-shift', branchId],
    queryFn: () => fetchCurrentShift(branchId),
  });

  const reassignMutation = useMutation({
    mutationFn: ({ entryId, targetBarberId }: { entryId: string; targetBarberId: string }) =>
      reassignCustomer(branchId, entryId, targetBarberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['barber-queue', branchId] });
    },
  });

  const autoReassignMutation = useMutation({
    mutationFn: () => autoReassignAll(branchId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['barber-queue', branchId] });
    },
    onError: () => {
      Alert.alert('Error', t('common.error.generic'));
    },
  });

  const markLeftMutation = useMutation({
    mutationFn: (entryId: string) => markCustomerLeft(branchId, entryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['barber-queue', branchId] });
    },
  });

  const endShiftMutation = useMutation({
    mutationFn: () => endShift(branchId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['barber-shift', branchId] });
      queryClient.invalidateQueries({ queryKey: ['barber-queue', branchId] });
      Alert.alert(t('common.done'), t('shift.summaryTitle'), [
        { text: t('common.done'), onPress: () => navigation.goBack() },
      ]);
    },
    onError: (err: any) => {
      Alert.alert('Error', err?.message || t('common.error.generic'));
    },
  });

  const waitingCustomers = queueQuery.data?.waiting ?? [];
  const servingCustomer = queueQuery.data?.serving;
  const isQueueEmpty = waitingCustomers.length === 0 && !servingCustomer;
  const summary = shiftQuery.data?.summary;
  const onShiftBarbers = (shiftQuery.data?.on_shift_barbers ?? []).filter(
    (b) => b.barber_id !== shiftQuery.data?.shift?.barber_id && b.status === 'ACTIVE',
  );

  return (
    <View style={{ flex: 1 }}>
      <WorkspaceHeader title={t('shift.end')} onBack={() => navigation.goBack()} />
      <Screen>
        {!isQueueEmpty ? (
          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            {/* Warning Card */}
            <Card style={{ borderColor: colors.danger, borderWidth: 1 }}>
              <AppText variant="body" style={{ color: colors.danger, fontWeight: '700' }}>
                {t('shift.mustResolveQueue')}
              </AppText>
              {onShiftBarbers.length > 0 && (
                <View style={{ marginTop: 8 }}>
                  <Button
                    variant="secondary"
                    label={t('queue.autoReassignAll')}
                    onPress={() => autoReassignMutation.mutate()}
                    loading={autoReassignMutation.isPending}
                  />
                </View>
              )}
            </Card>

            {/* Serving Customer (if any) */}
            {servingCustomer && (
              <Card>
                <AppText variant="caption">{t('queue.currentlyServing')}</AppText>
                <AppText variant="body" style={{ fontWeight: '700' }}>
                  {servingCustomer.walk_in_name || servingCustomer.customer_name || servingCustomer.token_number}
                </AppText>
                <AppText variant="caption">
                  {servingCustomer.services.map((s) => s.name).join(', ')}
                </AppText>
              </Card>
            )}

            {/* Waiting Customers */}
            <View style={styles.section}>
              <AppText variant="body" style={{ fontWeight: '700' }}>
                {t('queue.waitingTitle')} ({waitingCustomers.length})
              </AppText>

              {waitingCustomers.map((customer) => {
                const name =
                  customer.walk_in_name || customer.customer_name || customer.token_number || 'Customer';

                return (
                  <Card key={customer.id}>
                    <View style={styles.customerRow}>
                      <View style={{ flex: 1, gap: 2 }}>
                        <AppText variant="body" style={{ fontWeight: '700' }}>
                          {name}
                        </AppText>
                        <AppText variant="caption">
                          {customer.services.map((s) => s.name).join(', ')}
                        </AppText>
                      </View>
                      <TouchableOpacity
                        onPress={() => markLeftMutation.mutate(customer.id)}
                        style={[styles.leftBtn, { borderColor: colors.danger }]}
                      >
                        <AppText variant="caption" style={{ color: colors.danger, fontWeight: '600' }}>
                          {t('queue.customerLeft')}
                        </AppText>
                      </TouchableOpacity>
                    </View>

                    {/* Reassign to another barber */}
                    {onShiftBarbers.length > 0 && (
                      <View style={{ marginTop: 10, gap: 6 }}>
                        <AppText variant="caption">{t('queue.reassignSubtitle')}:</AppText>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                          {onShiftBarbers.map((b) => (
                            <TouchableOpacity
                              key={b.barber_id}
                              onPress={() =>
                                reassignMutation.mutate({
                                  entryId: customer.id,
                                  targetBarberId: b.barber_id,
                                })
                              }
                              style={[
                                styles.barberPill,
                                {
                                  backgroundColor: colors.background,
                                  borderColor: colors.border,
                                },
                              ]}
                            >
                              <AppText variant="caption" style={{ fontWeight: '600' }}>
                                → {b.name || b.phone}
                              </AppText>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                    )}
                  </Card>
                );
              })}
            </View>
          </ScrollView>
        ) : (
          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            {/* Shift Summary Card */}
            <Card>
              <AppText variant="title" style={{ fontSize: 20 }}>
                {t('shift.summaryTitle')}
              </AppText>

              <View style={styles.summaryRow}>
                <AppText variant="body">{t('shift.duration')}:</AppText>
                <AppText variant="body" style={{ fontWeight: '700' }}>
                  {summary?.duration_minutes ?? 0} mins
                </AppText>
              </View>

              <View style={styles.summaryRow}>
                <AppText variant="body">{t('shift.completedServices')}:</AppText>
                <AppText variant="body" style={{ fontWeight: '700' }}>
                  {summary?.completed_services_count ?? 0}
                </AppText>
              </View>

              <View style={styles.summaryRow}>
                <AppText variant="body">{t('shift.totalRevenue')}:</AppText>
                <AppText variant="body" style={{ fontWeight: '700' }}>
                  {formatCurrency(summary?.total_revenue ?? 0)}
                </AppText>
              </View>

              <View style={styles.summaryRow}>
                <AppText variant="body">{t('shift.commissionEarned')}:</AppText>
                <AppText variant="body" style={{ fontWeight: '800', color: colors.success }}>
                  {formatCurrency(summary?.total_commission ?? 0)}
                </AppText>
              </View>
            </Card>

            <View style={{ marginTop: 12 }}>
              <Button
                label={t('shift.end')}
                onPress={() => endShiftMutation.mutate()}
                loading={endShiftMutation.isPending}
              />
            </View>
          </ScrollView>
        )}
      </Screen>
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
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  barberPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
});
