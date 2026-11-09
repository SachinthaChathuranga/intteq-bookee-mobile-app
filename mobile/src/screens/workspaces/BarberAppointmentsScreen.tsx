import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import {
  fetchBarberAppointments,
  markAppointmentArrived,
  rescheduleBarberAppointment,
  type BarberAppointment,
} from '../../api/barber';
import { fetchBranchAvailability } from '../../api/customer';
import { useQueueSocket } from '../../api/socket';
import { AppText } from '../../components/AppText';
import { useT } from '../../i18n';
import { WorkspaceHeader } from '../../navigation/workspaces/WorkspaceHeader';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { useTheme } from '../../theme/ThemeProvider';
import {
  AppointmentCard,
  BottomSheet,
  Button,
  EmptyState,
  Screen,
  SkeletonCard,
  haptics,
  radius,
  spacing,
  useToast,
  type BadgeTone,
} from '../../ui';

function getNext7Days(): { dateStr: string; dayName: string; dayNum: string; isToday: boolean }[] {
  const days: { dateStr: string; dayName: string; dayNum: string; isToday: boolean }[] = [];
  const now = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;
    const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
    days.push({
      dateStr,
      dayName,
      dayNum: String(d.getDate()),
      isToday: i === 0,
    });
  }
  return days;
}

export function BarberAppointmentsScreen() {
  const t = useT();
  const { colors } = useTheme();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const activeWorkspace = useWorkspaceStore((s) => s.activeWorkspace);
  const branchId = activeWorkspace?.branch_id;

  useQueueSocket(branchId);

  const days = useMemo(() => getNext7Days(), []);
  const [rescheduleTarget, setRescheduleTarget] = useState<BarberAppointment | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(days[0].dateStr);
  const [selectedSlot, setSelectedSlot] = useState<{ time: string; start_at: string } | null>(null);

  const appointmentsQuery = useQuery({
    queryKey: ['barber-appointments', branchId],
    queryFn: () => fetchBarberAppointments(branchId!),
    enabled: Boolean(branchId),
  });

  const targetServiceIds = useMemo(() => {
    if (!rescheduleTarget) return [];
    return rescheduleTarget.services.map((s) => s.service_id);
  }, [rescheduleTarget]);

  const availabilityQuery = useQuery({
    queryKey: [
      'barber-reschedule-availability',
      branchId,
      selectedDate,
      targetServiceIds.join(','),
      rescheduleTarget?.barber_id,
    ],
    queryFn: () =>
      fetchBranchAvailability(
        branchId!,
        selectedDate,
        targetServiceIds,
        rescheduleTarget!.barber_id,
      ),
    enabled: Boolean(branchId && rescheduleTarget && targetServiceIds.length > 0),
  });

  const markArrivedMutation = useMutation({
    mutationFn: (appointmentId: string) => markAppointmentArrived(appointmentId),
    onSuccess: () => {
      haptics.success();
      queryClient.invalidateQueries({ queryKey: ['barber-appointments', branchId] });
      queryClient.invalidateQueries({ queryKey: ['barber-queue', branchId] });
      showToast({ title: t('barber.appointments.arrivedSuccess'), tone: 'success' });
    },
    onError: (err: any) => {
      showToast({ title: err?.message || t('common.error.generic'), tone: 'error' });
    },
  });

  const rescheduleMutation = useMutation({
    mutationFn: () => {
      if (!rescheduleTarget || !selectedSlot) throw new Error('Select a slot');
      return rescheduleBarberAppointment(rescheduleTarget.id, selectedSlot.start_at);
    },
    onSuccess: () => {
      haptics.success();
      setRescheduleTarget(null);
      setSelectedSlot(null);
      queryClient.invalidateQueries({ queryKey: ['barber-appointments', branchId] });
      showToast({ title: t('barber.appointments.rescheduleSuccess'), tone: 'success' });
    },
    onError: (err: any) => {
      showToast({ title: err?.message || t('common.error.generic'), tone: 'error' });
    },
  });

  const appointments = appointmentsQuery.data?.appointments ?? [];

  const renderItem = ({ item }: { item: BarberAppointment }) => {
    const startDate = new Date(item.start_at);
    const dateStr = startDate.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
    const timeStr = startDate.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

    const isBooked = item.status === 'BOOKED';
    const isArrived = item.status === 'ARRIVED';

    const statusTone: BadgeTone = isBooked
      ? 'primary'
      : isArrived
        ? 'success'
        : 'neutral';

    return (
      <AppointmentCard
        title={item.customer_name}
        subtitle={item.customer_phone}
        dateLabel={dateStr}
        timeLabel={timeStr}
        personLabel={item.customer_name}
        status={item.status}
        statusTone={statusTone}
        services={item.services}
        totalPrice={item.total_price}
        totalDurationLabel={t('booking.duration', { mins: item.total_duration_minutes })}
        notes={item.notes}
        actions={
          isBooked ? (
            <View style={styles.actionsRow}>
              <View style={styles.flexItem}>
                <Button
                  label={t('barber.appointments.markArrived')}
                  variant="primary"
                  size="sm"
                  leftIcon="checkmark-circle-outline"
                  loading={markArrivedMutation.isPending}
                  onPress={() => markArrivedMutation.mutate(item.id)}
                />
              </View>
              <View style={styles.flexItem}>
                <Button
                  label={t('barber.appointments.reschedule')}
                  variant="secondary"
                  size="sm"
                  leftIcon="calendar-outline"
                  onPress={() => {
                    haptics.light();
                    setRescheduleTarget(item);
                    setSelectedDate(days[0].dateStr);
                    setSelectedSlot(null);
                  }}
                />
              </View>
            </View>
          ) : undefined
        }
      />
    );
  };

  const avail = availabilityQuery.data;

  return (
    <View style={styles.flex}>
      <WorkspaceHeader title={t('barber.appointments.title')} />
      <Screen scroll={false}>
        <FlatList
          data={appointments}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={appointmentsQuery.isRefetching}
              onRefresh={() => {
                void appointmentsQuery.refetch();
              }}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            appointmentsQuery.isLoading ? (
              <View style={{ gap: spacing.md }}>
                <SkeletonCard />
                <SkeletonCard />
              </View>
            ) : (
              <EmptyState
                icon="calendar-outline"
                title={t('barber.appointments.empty')}
              />
            )
          }
        />

        <BottomSheet
          visible={Boolean(rescheduleTarget)}
          onClose={() => setRescheduleTarget(null)}
          title={t('barber.appointments.rescheduleTitle')}
          subtitle={rescheduleTarget?.customer_name}
          footer={
            <View style={{ gap: spacing.sm }}>
              <Button
                label={t('barber.appointments.confirmReschedule')}
                disabled={!selectedSlot}
                loading={rescheduleMutation.isPending}
                onPress={() => rescheduleMutation.mutate()}
              />
              <Button
                label={t('common.cancel')}
                variant="ghost"
                onPress={() => setRescheduleTarget(null)}
              />
            </View>
          }
        >
          <View style={styles.sheetBody}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.dateScroll}
            >
              {days.map((d) => {
                const isSelected = d.dateStr === selectedDate;
                return (
                  <Pressable
                    key={d.dateStr}
                    onPress={() => {
                      haptics.selection();
                      setSelectedDate(d.dateStr);
                      setSelectedSlot(null);
                    }}
                    style={[
                      styles.dateChip,
                      {
                        backgroundColor: isSelected ? colors.primary : colors.inputBackground,
                        borderColor: isSelected ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <AppText
                      variant="label"
                      style={{ color: isSelected ? colors.onPrimary : colors.textMuted }}
                    >
                      {d.isToday ? t('booking.today') : d.dayName}
                    </AppText>
                    <AppText
                      variant="heading3"
                      style={{ color: isSelected ? colors.onPrimary : colors.text }}
                    >
                      {d.dayNum}
                    </AppText>
                  </Pressable>
                );
              })}
            </ScrollView>

            {availabilityQuery.isLoading ? (
              <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.lg }} />
            ) : avail?.is_closed ? (
              <EmptyState compact icon="lock-closed-outline" title={t('booking.closed')} />
            ) : !avail?.slots || avail.slots.filter((s) => s.available).length === 0 ? (
              <EmptyState compact icon="calendar-outline" title={t('booking.noSlots')} />
            ) : (
              <View style={styles.slotsGrid}>
                {avail.slots
                  .filter((s) => s.available)
                  .map((slot) => {
                    const isSelected = selectedSlot?.start_at === slot.start_at;
                    return (
                      <Pressable
                        key={slot.start_at}
                        onPress={() => {
                          haptics.selection();
                          setSelectedSlot(slot);
                        }}
                        style={[
                          styles.slotChip,
                          {
                            backgroundColor: isSelected ? colors.primary : colors.inputBackground,
                            borderColor: isSelected ? colors.primary : colors.border,
                          },
                        ]}
                      >
                        <AppText
                          variant="bodyBold"
                          style={{ color: isSelected ? colors.onPrimary : colors.text }}
                        >
                          {slot.time}
                        </AppText>
                      </Pressable>
                    );
                  })}
              </View>
            )}
          </View>
        </BottomSheet>
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  listContent: {
    gap: spacing.md,
    paddingBottom: spacing.xxl,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    width: '100%',
  },
  flexItem: {
    flex: 1,
  },
  sheetBody: {
    gap: spacing.md,
  },
  dateScroll: {
    gap: spacing.sm,
    paddingVertical: 4,
  },
  dateChip: {
    width: 64,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    gap: 2,
  },
  slotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  slotChip: {
    width: '31%',
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.sm,
    borderWidth: 1,
    alignItems: 'center',
  },
});
