import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import React, { useMemo, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import {
  fetchBarberAppointments,
  markAppointmentArrived,
  rescheduleBarberAppointment,
  type BarberAppointment,
} from '../../api/barber';
import { fetchBranchAvailability, type SlotAvailability } from '../../api/customer';
import { useQueueSocket } from '../../api/socket';
import { AppText } from '../../components/AppText';
import { useT } from '../../i18n';
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
  Skeleton,
  radius,
  spacing,
} from '../../ui';
import { haptics } from '../../ui/haptics';
import { formatCurrency } from '../../utils/format';

function getNext7DaysColombo() {
  const days: { dateStr: string; weekday: string; dayNum: string; isToday: boolean; isTomorrow: boolean }[] = [];
  const now = new Date();

  for (let i = 0; i < 7; i++) {
    const d = new Date(now.getTime() + i * 24 * 60 * 60 * 1000);
    const dateStr = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Colombo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(d);

    const weekday = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Colombo',
      weekday: 'short',
    }).format(d);

    const dayNum = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Colombo',
      day: 'numeric',
    }).format(d);

    days.push({
      dateStr,
      weekday,
      dayNum,
      isToday: i === 0,
      isTomorrow: i === 1,
    });
  }
  return days;
}

export function BarberAppointmentsScreen() {
  const t = useT();
  const { colors } = useTheme();
  const queryClient = useQueryClient();

  const activeWorkspace = useWorkspaceStore((s) => s.activeWorkspace);
  const activeBranchId = useWorkspaceStore((s) => s.activeBranchId) ?? activeWorkspace?.branch_id;

  // Real-time WebSocket connection
  useQueueSocket(activeBranchId);

  const sevenDays = useMemo(() => getNext7DaysColombo(), []);
  const [reschedulingAppt, setReschedulingAppt] = useState<BarberAppointment | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(sevenDays[0]?.dateStr ?? '');
  const [selectedSlot, setSelectedSlot] = useState<SlotAvailability | null>(null);
  const [rescheduleError, setRescheduleError] = useState<string | null>(null);

  const appointmentsQuery = useQuery({
    queryKey: ['barber-appointments', activeBranchId],
    queryFn: () => fetchBarberAppointments(activeBranchId!),
    enabled: Boolean(activeBranchId),
  });

  const appointments = appointmentsQuery.data?.appointments ?? [];

  // Service IDs of appointment being rescheduled
  const reschedulingServiceIds = useMemo(() => {
    if (!reschedulingAppt) return [];
    return reschedulingAppt.services
      .map((s) => s.id ?? s.service_id)
      .filter((id): id is string => Boolean(id));
  }, [reschedulingAppt]);

  // Branch availability query for reschedule
  const availabilityQuery = useQuery({
    queryKey: [
      'branch-availability',
      activeBranchId,
      selectedDate,
      reschedulingServiceIds,
      reschedulingAppt?.barber_id,
    ],
    queryFn: () =>
      fetchBranchAvailability(
        activeBranchId!,
        selectedDate,
        reschedulingServiceIds,
        reschedulingAppt?.barber_id,
      ),
    enabled: !!activeBranchId && !!reschedulingAppt && !!selectedDate,
  });

  // Mark Arrived Mutation
  const markArrivedMutation = useMutation({
    mutationFn: (appointmentId: string) => markAppointmentArrived(appointmentId),
    onSuccess: (data) => {
      haptics.success();
      queryClient.invalidateQueries({ queryKey: ['barber-appointments'] });
      queryClient.invalidateQueries({ queryKey: ['barber-queue'] });
      Alert.alert(t('common.success'), `${t('barber.appointments.arrivedSuccess')} (${data.token})`);
    },
    onError: (err: any) => {
      haptics.medium();
      Alert.alert(t('common.error.generic'), err?.message || t('common.error.generic'));
    },
  });

  // Reschedule Mutation
  const rescheduleMutation = useMutation({
    mutationFn: ({ appointmentId, startAt }: { appointmentId: string; startAt: string }) =>
      rescheduleBarberAppointment(appointmentId, startAt),
    onSuccess: () => {
      haptics.success();
      queryClient.invalidateQueries({ queryKey: ['barber-appointments'] });
      setReschedulingAppt(null);
      setSelectedSlot(null);
      setRescheduleError(null);
      Alert.alert(t('common.success'), t('barber.appointments.rescheduleSuccess'));
    },
    onError: (err: any) => {
      haptics.medium();
      if (err?.code === 'SLOT_ALREADY_BOOKED' || err?.message?.includes('SLOT_ALREADY_BOOKED')) {
        setRescheduleError(t('appointments.slotConflict'));
        availabilityQuery.refetch();
      } else {
        setRescheduleError(err?.message || t('common.error.generic'));
      }
    },
  });

  const handleOpenReschedule = (apt: BarberAppointment) => {
    haptics.light();
    setReschedulingAppt(apt);
    setSelectedDate(sevenDays[0]?.dateStr ?? '');
    setSelectedSlot(null);
    setRescheduleError(null);
  };

  const handleCallCustomer = (phone: string) => {
    haptics.light();
    Linking.openURL(`tel:${phone}`).catch(() => {});
  };

  return (
    <Screen
      scrollable
      refreshing={appointmentsQuery.isRefetching}
      onRefresh={() => appointmentsQuery.refetch()}
      contentContainerStyle={styles.container}
    >
      <WorkspaceHeader title={t('barber.appointments.title')} />

      {appointmentsQuery.isLoading ? (
        <View style={{ gap: spacing.md, marginTop: spacing.md }}>
          <Skeleton width="100%" height={140} borderRadius={radius.card} />
          <Skeleton width="100%" height={140} borderRadius={radius.card} />
        </View>
      ) : appointments.length === 0 ? (
        <View style={{ marginTop: spacing.xl }}>
          <EmptyState
            icon={<Ionicons name="calendar-outline" size={36} color={colors.textMuted} />}
            title={t('barber.appointments.title')}
            description={t('barber.appointments.empty')}
          />
        </View>
      ) : (
        <View style={{ gap: spacing.md, marginTop: spacing.sm }}>
          {appointments.map((apt) => {
            const startDate = new Date(apt.start_at);
            const endDate = new Date(apt.end_at);
            const timeStr = `${startDate.toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })} - ${endDate.toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}`;

            const canAct = apt.status === 'CONFIRMED' || apt.status === 'RESCHEDULED';

            return (
              <Card key={apt.id} style={styles.appointmentCard}>
                <View style={styles.topRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 }}>
                    <Avatar name={apt.customer_name} size="sm" shape="square" />
                    <View style={{ flex: 1 }}>
                      <AppText variant="heading" style={{ fontSize: 16 }}>
                        {apt.customer_name}
                      </AppText>
                      {apt.customer_phone ? (
                        <Pressable
                          onPress={() => handleCallCustomer(apt.customer_phone)}
                          style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}
                        >
                          <Ionicons name="call-outline" size={13} color={colors.primary} />
                          <AppText variant="caption" style={{ color: colors.primary, fontWeight: '600' }}>
                            {apt.customer_phone}
                          </AppText>
                        </Pressable>
                      ) : null}
                    </View>
                  </View>

                  <Badge
                    label={apt.status}
                    variant={
                      apt.status === 'CONFIRMED' || apt.status === 'RESCHEDULED'
                        ? 'primary'
                        : apt.status === 'ARRIVED' || apt.status === 'COMPLETED'
                        ? 'success'
                        : 'neutral'
                    }
                  />
                </View>

                {/* Time & Price Row */}
                <View style={[styles.timeRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                    <Ionicons name="time-outline" size={16} color={colors.textMuted} />
                    <AppText variant="bodyBold" style={{ fontSize: 14 }}>
                      {timeStr}
                    </AppText>
                  </View>
                  <AppText variant="bodyBold" style={{ color: colors.primary, fontSize: 15 }}>
                    {formatCurrency(apt.total_price)}
                  </AppText>
                </View>

                {/* Services */}
                {apt.services.length > 0 && (
                  <View style={styles.servicesRow}>
                    <AppText variant="caption" style={{ color: colors.textMuted }}>
                      {apt.services.map((s) => s.name).join(', ')} ({apt.total_duration_minutes} mins)
                    </AppText>
                  </View>
                )}

                {/* Action Buttons for Confirmed/Rescheduled appointments */}
                {canAct && (
                  <View style={styles.actionsRow}>
                    <Button
                      label={t('barber.appointments.markArrived')}
                      variant="primary"
                      size="small"
                      loading={markArrivedMutation.isPending && markArrivedMutation.variables === apt.id}
                      onPress={() => markArrivedMutation.mutate(apt.id)}
                      style={{ flex: 1 }}
                    />
                    <Button
                      label={t('barber.appointments.reschedule')}
                      variant="secondary"
                      size="small"
                      onPress={() => handleOpenReschedule(apt)}
                      style={{ flex: 1 }}
                    />
                  </View>
                )}
              </Card>
            );
          })}
        </View>
      )}

      {/* Reschedule Bottom Sheet */}
      <BottomSheet
        visible={!!reschedulingAppt}
        onClose={() => {
          setReschedulingAppt(null);
          setSelectedSlot(null);
          setRescheduleError(null);
        }}
        title={t('barber.appointments.rescheduleTitle')}
      >
        <View style={styles.sheetContent}>
          {reschedulingAppt && (
            <>
              {/* Conflict/General Error */}
              {rescheduleError && (
                <View style={[styles.errorBox, { backgroundColor: colors.surface, borderColor: colors.danger }]}>
                  <Ionicons name="alert-circle" size={18} color={colors.danger} />
                  <AppText variant="caption" style={{ color: colors.danger, flex: 1, fontWeight: '600' }}>
                    {rescheduleError}
                  </AppText>
                </View>
              )}

              {/* Date selection strip */}
              <AppText variant="bodyBold" style={{ fontSize: 15 }}>
                {t('appointments.selectDate')}
              </AppText>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.dateChipsRow}
              >
                {sevenDays.map((day) => {
                  const isSelected = selectedDate === day.dateStr;
                  let dayLabel = day.weekday;
                  if (day.isToday) dayLabel = t('booking.today');
                  else if (day.isTomorrow) dayLabel = t('booking.tomorrow');

                  return (
                    <Pressable
                      key={day.dateStr}
                      onPress={() => {
                        haptics.selection();
                        setSelectedDate(day.dateStr);
                        setSelectedSlot(null);
                        setRescheduleError(null);
                      }}
                      style={[
                        styles.dateChip,
                        {
                          backgroundColor: isSelected ? colors.primary : colors.surface,
                          borderColor: isSelected ? colors.primary : colors.border,
                        },
                      ]}
                    >
                      <AppText
                        variant="caption"
                        style={{
                          color: isSelected ? colors.onPrimary : colors.textMuted,
                          fontWeight: '600',
                        }}
                      >
                        {dayLabel}
                      </AppText>
                      <AppText
                        variant="heading"
                        style={{
                          color: isSelected ? colors.onPrimary : colors.text,
                          fontSize: 16,
                          marginTop: 2,
                        }}
                      >
                        {day.dayNum}
                      </AppText>
                    </Pressable>
                  );
                })}
              </ScrollView>

              {/* Available Slots */}
              <AppText variant="bodyBold" style={{ fontSize: 15, marginTop: spacing.sm }}>
                {t('appointments.selectSlot')}
              </AppText>

              {availabilityQuery.isLoading ? (
                <View style={styles.slotsGrid}>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} width="30%" height={42} borderRadius={radius.input} />
                  ))}
                </View>
              ) : !availabilityQuery.data?.slots || availabilityQuery.data.slots.length === 0 ? (
                <EmptyState
                  icon={<Ionicons name="time-outline" size={32} color={colors.textMuted} />}
                  title={t('booking.noSlots')}
                  description={t('booking.noSlots')}
                />
              ) : (
                <View style={styles.slotsGrid}>
                  {availabilityQuery.data.slots.map((slot) => {
                    const isSelected = selectedSlot?.time === slot.time;
                    const isAvailable = slot.available;

                    return (
                      <Pressable
                        key={slot.time}
                        disabled={!isAvailable}
                        onPress={() => {
                          haptics.selection();
                          setSelectedSlot(slot);
                          setRescheduleError(null);
                        }}
                        style={[
                          styles.slotItem,
                          {
                            backgroundColor: isSelected
                              ? colors.primary
                              : isAvailable
                              ? colors.surface
                              : colors.background,
                            borderColor: isSelected
                              ? colors.primary
                              : colors.border,
                            opacity: isAvailable ? 1 : 0.45,
                          },
                        ]}
                      >
                        <AppText
                          variant="bodyBold"
                          style={{
                            color: isSelected
                              ? colors.onPrimary
                              : isAvailable
                              ? colors.text
                              : colors.textMuted,
                            fontSize: 13,
                          }}
                        >
                          {slot.time}
                        </AppText>
                      </Pressable>
                    );
                  })}
                </View>
              )}

              {/* Confirm Reschedule Button */}
              <View style={{ marginTop: spacing.lg }}>
                <Button
                  label={t('barber.appointments.confirmReschedule')}
                  disabled={!selectedSlot || rescheduleMutation.isPending}
                  loading={rescheduleMutation.isPending}
                  onPress={() => {
                    if (!selectedSlot || !reschedulingAppt) return;
                    rescheduleMutation.mutate({
                      appointmentId: reschedulingAppt.id,
                      startAt: selectedSlot.start_at,
                    });
                  }}
                />
              </View>
            </>
          )}
        </View>
      </BottomSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  appointmentCard: {
    gap: spacing.sm,
    padding: spacing.md,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.sm,
    borderRadius: radius.input,
    borderWidth: 1,
    marginTop: 2,
  },
  servicesRow: {
    paddingTop: 2,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  sheetContent: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  dateChipsRow: {
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  dateChip: {
    width: 60,
    height: 60,
    borderRadius: radius.card,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  slotItem: {
    width: '30%',
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.input,
    borderWidth: 1,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.input,
    borderWidth: 1,
    marginBottom: spacing.xs,
  },
});
