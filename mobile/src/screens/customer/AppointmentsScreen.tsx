import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import React, { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import {
  cancelCustomerAppointment,
  fetchBranchAvailability,
  fetchCustomerAppointments,
  rescheduleCustomerAppointment,
  type CustomerBookedAppointment,
  type SlotAvailability,
} from '../../api/customer';
import { AppText } from '../../components/AppText';
import { useT } from '../../i18n';
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

export function AppointmentsScreen() {
  const t = useT();
  const { colors } = useTheme();
  const queryClient = useQueryClient();

  const sevenDays = useMemo(() => getNext7DaysColombo(), []);
  const [reschedulingAppt, setReschedulingAppt] = useState<CustomerBookedAppointment | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(sevenDays[0]?.dateStr ?? '');
  const [selectedSlot, setSelectedSlot] = useState<SlotAvailability | null>(null);
  const [rescheduleError, setRescheduleError] = useState<string | null>(null);

  const appointmentsQuery = useQuery({
    queryKey: ['customer-appointments'],
    queryFn: () => fetchCustomerAppointments(),
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
      reschedulingAppt?.branch_id,
      selectedDate,
      reschedulingServiceIds,
      reschedulingAppt?.barber_id,
    ],
    queryFn: () =>
      fetchBranchAvailability(
        reschedulingAppt!.branch_id,
        selectedDate,
        reschedulingServiceIds,
        reschedulingAppt?.barber_id,
      ),
    enabled: !!reschedulingAppt && !!selectedDate,
  });

  // Cancel Mutation
  const cancelMutation = useMutation({
    mutationFn: (appointmentId: string) => cancelCustomerAppointment(appointmentId),
    onSuccess: () => {
      haptics.success();
      queryClient.invalidateQueries({ queryKey: ['customer-appointments'] });
      Alert.alert(t('common.success'), t('appointments.cancelSuccess'));
    },
    onError: (err: any) => {
      haptics.medium();
      Alert.alert(t('common.error.generic'), err?.message || t('common.error.generic'));
    },
  });

  // Reschedule Mutation
  const rescheduleMutation = useMutation({
    mutationFn: ({ appointmentId, startAt }: { appointmentId: string; startAt: string }) =>
      rescheduleCustomerAppointment(appointmentId, startAt),
    onSuccess: () => {
      haptics.success();
      queryClient.invalidateQueries({ queryKey: ['customer-appointments'] });
      setReschedulingAppt(null);
      setSelectedSlot(null);
      setRescheduleError(null);
      Alert.alert(t('common.success'), t('appointments.rescheduleSuccess'));
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

  const handleOpenReschedule = (apt: CustomerBookedAppointment) => {
    haptics.light();
    setReschedulingAppt(apt);
    setSelectedDate(sevenDays[0]?.dateStr ?? '');
    setSelectedSlot(null);
    setRescheduleError(null);
  };

  const handleCancelPress = (apt: CustomerBookedAppointment) => {
    haptics.medium();
    Alert.alert(
      t('appointments.cancelConfirmTitle'),
      t('appointments.cancelConfirmMessage'),
      [
        {
          text: t('appointments.keepBtn'),
          style: 'cancel',
        },
        {
          text: t('appointments.cancelConfirmBtn'),
          style: 'destructive',
          onPress: () => cancelMutation.mutate(apt.id),
        },
      ],
    );
  };

  return (
    <Screen
      scrollable
      refreshing={appointmentsQuery.isRefetching}
      onRefresh={() => appointmentsQuery.refetch()}
      contentContainerStyle={styles.container}
    >
      <View style={styles.header}>
        <AppText variant="title" style={styles.title}>
          {t('appointments.title')}
        </AppText>
      </View>

      {appointmentsQuery.isLoading ? (
        <View style={{ gap: spacing.md }}>
          <Skeleton width="100%" height={140} borderRadius={radius.card} />
          <Skeleton width="100%" height={140} borderRadius={radius.card} />
        </View>
      ) : appointments.length === 0 ? (
        <EmptyState
          icon={<Ionicons name="calendar-outline" size={36} color={colors.textMuted} />}
          title={t('appointments.title')}
          description={t('appointments.placeholder')}
        />
      ) : (
        <View style={{ gap: spacing.md }}>
          {appointments.map((apt) => {
            const startDate = new Date(apt.start_at);
            const isUpcoming =
              (apt.status === 'CONFIRMED' || apt.status === 'RESCHEDULED') &&
              new Date(apt.end_at).getTime() > Date.now();

            const dateStr = startDate.toLocaleDateString([], {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
            });
            const timeStr = startDate.toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <Card key={apt.id} style={styles.appointmentCard}>
                <View style={styles.topRow}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <AppText variant="heading" style={{ fontSize: 17 }}>
                      {apt.business_name}
                    </AppText>
                    <View style={styles.branchRow}>
                      <Ionicons name="location-sharp" size={14} color={colors.primary} />
                      <AppText variant="caption" style={{ color: colors.primary, fontWeight: '700' }}>
                        {apt.branch_name}
                      </AppText>
                    </View>
                  </View>

                  <Badge
                    label={apt.status}
                    variant={
                      apt.status === 'CONFIRMED' || apt.status === 'RESCHEDULED'
                        ? 'primary'
                        : apt.status === 'COMPLETED'
                        ? 'success'
                        : 'neutral'
                    }
                  />
                </View>

                {/* Barber and Date */}
                <View style={[styles.barberRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Avatar name={apt.barber_name} shape="square" size="sm" />
                  <View style={{ flex: 1 }}>
                    <AppText variant="bodyBold" style={{ fontSize: 14 }}>
                      {apt.barber_name}
                    </AppText>
                    <AppText variant="caption" style={{ color: colors.textMuted }}>
                      {dateStr} • {timeStr}
                    </AppText>
                  </View>

                  <AppText variant="heading" style={{ color: colors.primary, fontSize: 16 }}>
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

                {/* Actions for upcoming appointments */}
                {isUpcoming && (
                  <View style={styles.actionsRow}>
                    <Button
                      label={t('appointments.cancel')}
                      variant="danger"
                      size="small"
                      loading={cancelMutation.isPending && cancelMutation.variables === apt.id}
                      onPress={() => handleCancelPress(apt)}
                      style={{ flex: 1 }}
                    />
                    <Button
                      label={t('appointments.reschedule')}
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
        title={t('appointments.rescheduleTitle')}
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
                  label={t('appointments.confirmReschedule')}
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
    gap: spacing.md,
  },
  header: {
    marginBottom: spacing.xs,
  },
  title: {
    fontSize: 26,
    letterSpacing: -0.5,
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
  branchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  barberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: radius.input,
    borderWidth: 1,
    gap: spacing.sm,
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
