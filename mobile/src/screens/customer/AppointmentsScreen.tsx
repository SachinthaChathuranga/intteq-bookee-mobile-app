import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
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
  cancelCustomerAppointment,
  fetchBranchAvailability,
  fetchCustomerAppointments,
  rescheduleCustomerAppointment,
  type CustomerBookedAppointment,
} from '../../api/customer';
import { AppText } from '../../components/AppText';
import { useT } from '../../i18n';
import type { CustomerTabParamList } from '../../navigation/types';
import { useTheme } from '../../theme/ThemeProvider';
import {
  AppointmentCard,
  BottomSheet,
  Button,
  ConfirmationDialog,
  EmptyState,
  Screen,
  ScreenHeader,
  SegmentedControl,
  SkeletonCard,
  haptics,
  radius,
  spacing,
  useToast,
  type BadgeTone,
} from '../../ui';

type Props = BottomTabScreenProps<CustomerTabParamList, 'AppointmentsTab'>;

type TabType = 'upcoming' | 'past';

function getNext14Days(): { dateStr: string; dayName: string; dayNum: string; isToday: boolean }[] {
  const days: { dateStr: string; dayName: string; dayNum: string; isToday: boolean }[] = [];
  const now = new Date();
  for (let i = 0; i < 14; i++) {
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

export function AppointmentsScreen({ navigation }: Props) {
  const t = useT();
  const { colors } = useTheme();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<TabType>('upcoming');
  const [cancellingAppt, setCancellingAppt] = useState<CustomerBookedAppointment | null>(null);
  const [rescheduleTarget, setRescheduleTarget] = useState<CustomerBookedAppointment | null>(null);
  const days = useMemo(() => getNext14Days(), []);
  const [selectedDate, setSelectedDate] = useState<string>(days[0].dateStr);
  const [selectedSlot, setSelectedSlot] = useState<{ time: string; start_at: string } | null>(null);

  const appointmentsQuery = useQuery({
    queryKey: ['customer-appointments'],
    queryFn: fetchCustomerAppointments,
  });

  const targetServiceIds = useMemo(() => {
    if (!rescheduleTarget) return [];
    return rescheduleTarget.services
      .map((s) => s.service_id || s.id || '')
      .filter(Boolean);
  }, [rescheduleTarget]);

  const availabilityQuery = useQuery({
    queryKey: [
      'reschedule-availability',
      rescheduleTarget?.branch_id,
      selectedDate,
      targetServiceIds.join(','),
      rescheduleTarget?.barber_id,
    ],
    queryFn: () =>
      fetchBranchAvailability(
        rescheduleTarget!.branch_id,
        selectedDate,
        targetServiceIds,
        rescheduleTarget!.barber_id,
      ),
    enabled: Boolean(rescheduleTarget && targetServiceIds.length > 0),
  });

  const cancelMutation = useMutation({
    mutationFn: (appointmentId: string) => cancelCustomerAppointment(appointmentId),
    onSuccess: () => {
      haptics.medium();
      setCancellingAppt(null);
      queryClient.invalidateQueries({ queryKey: ['customer-appointments'] });
      showToast({ title: t('appointments.cancelSuccess'), tone: 'success' });
    },
    onError: (err: any) => {
      setCancellingAppt(null);
      showToast({ title: err?.message || t('common.error.generic'), tone: 'error' });
    },
  });

  const rescheduleMutation = useMutation({
    mutationFn: () => {
      if (!rescheduleTarget || !selectedSlot) throw new Error('Missing selection');
      return rescheduleCustomerAppointment(rescheduleTarget.id, selectedSlot.start_at);
    },
    onSuccess: () => {
      haptics.success();
      setRescheduleTarget(null);
      setSelectedSlot(null);
      queryClient.invalidateQueries({ queryKey: ['customer-appointments'] });
      showToast({ title: t('appointments.rescheduleSuccess'), tone: 'success' });
    },
    onError: (err: any) => {
      if (err?.status === 409) {
        showToast({ title: t('appointments.slotConflict'), tone: 'error' });
        setSelectedSlot(null);
        void availabilityQuery.refetch();
      } else {
        showToast({ title: err?.message || t('common.error.generic'), tone: 'error' });
      }
    },
  });

  const allAppointments = appointmentsQuery.data?.appointments ?? [];

  const { upcomingList, pastList } = useMemo(() => {
    const upcoming: CustomerBookedAppointment[] = [];
    const past: CustomerBookedAppointment[] = [];
    for (const appt of allAppointments) {
      if (appt.status === 'BOOKED') {
        upcoming.push(appt);
      } else {
        past.push(appt);
      }
    }
    return { upcomingList: upcoming, pastList: past };
  }, [allAppointments]);

  const displayedList = activeTab === 'upcoming' ? upcomingList : pastList;

  const openReschedule = (item: CustomerBookedAppointment) => {
    haptics.light();
    setRescheduleTarget(item);
    setSelectedDate(days[0].dateStr);
    setSelectedSlot(null);
  };

  const renderItem = ({ item }: { item: CustomerBookedAppointment }) => {
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
    const isCancelled = item.status === 'CANCELLED';

    const statusTone: BadgeTone = isBooked
      ? 'primary'
      : isCancelled
        ? 'danger'
        : 'success';

    return (
      <AppointmentCard
        title={item.business_name}
        subtitle={item.branch_name}
        dateLabel={dateStr}
        timeLabel={timeStr}
        personLabel={item.barber_name || t('term.barber')}
        personAvatar={item.barber_avatar}
        status={item.status}
        statusTone={statusTone}
        services={item.services}
        totalPrice={item.total_price}
        totalDurationLabel={t('booking.duration', { mins: item.total_duration_minutes })}
        actions={
          isBooked ? (
            <View style={styles.actionsRow}>
              <View style={styles.actionItem}>
                <Button
                  label={t('appointments.reschedule')}
                  variant="secondary"
                  size="sm"
                  leftIcon="calendar-outline"
                  onPress={() => openReschedule(item)}
                />
              </View>
              <View style={styles.actionItem}>
                <Button
                  label={t('appointments.cancel')}
                  variant="danger"
                  size="sm"
                  leftIcon="close-circle-outline"
                  onPress={() => setCancellingAppt(item)}
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
    <Screen scroll={false}>
      <View style={styles.container}>
        <ScreenHeader title={t('appointments.title')} />

        <SegmentedControl
          value={activeTab}
          onChange={setActiveTab}
          options={[
            {
              key: 'upcoming',
              label: t('appointments.upcomingTab'),
              count: upcomingList.length,
            },
            {
              key: 'past',
              label: t('appointments.pastTab'),
              count: pastList.length,
            },
          ]}
        />

        <FlatList
          data={displayedList}
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
              <View style={styles.skeletonWrap}>
                <SkeletonCard />
                <SkeletonCard />
              </View>
            ) : activeTab === 'upcoming' ? (
              <EmptyState
                icon="calendar-outline"
                title={t('appointments.emptyUpcomingTitle')}
                description={t('appointments.emptyUpcomingDesc')}
                actionLabel={t('appointments.exploreCta')}
                onActionPress={() => navigation.navigate('ExploreTab')}
              />
            ) : (
              <EmptyState
                icon="time-outline"
                title={t('appointments.emptyPastTitle')}
                description={t('appointments.emptyPastDesc')}
              />
            )
          }
        />

        {/* Cancel Appointment Confirmation Dialog */}
        <ConfirmationDialog
          visible={Boolean(cancellingAppt)}
          title={t('appointments.cancelConfirmTitle')}
          description={t('appointments.cancelConfirmMessage')}
          confirmLabel={t('appointments.cancelConfirmBtn')}
          cancelLabel={t('appointments.keepBtn')}
          tone="danger"
          icon="calendar-clear-outline"
          loading={cancelMutation.isPending}
          onConfirm={() => {
            if (cancellingAppt) {
              cancelMutation.mutate(cancellingAppt.id);
            }
          }}
          onCancel={() => setCancellingAppt(null)}
        />

        {/* Reschedule Bottom Sheet */}
        <BottomSheet
          visible={Boolean(rescheduleTarget)}
          onClose={() => setRescheduleTarget(null)}
          title={t('appointments.rescheduleTitle')}
          subtitle={
            rescheduleTarget
              ? `${rescheduleTarget.business_name} • ${rescheduleTarget.barber_name}`
              : undefined
          }
          footer={
            <View style={{ gap: spacing.sm }}>
              <Button
                label={t('appointments.confirmReschedule')}
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
            <AppText variant="label" style={{ color: colors.textSecondary }}>
              {t('appointments.selectDate')}
            </AppText>
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

            <AppText variant="label" style={{ color: colors.textSecondary, marginTop: spacing.xs }}>
              {t('appointments.selectSlot')}
            </AppText>

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
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: spacing.md,
  },
  listContent: {
    gap: spacing.md,
    paddingBottom: spacing.xxl,
  },
  skeletonWrap: {
    gap: spacing.md,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    width: '100%',
  },
  actionItem: {
    flex: 1,
  },
  sheetBody: {
    gap: spacing.sm,
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
