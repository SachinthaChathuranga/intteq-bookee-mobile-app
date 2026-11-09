import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import {
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import {
  createCustomerAppointment,
  fetchBarberTodayBranch,
  fetchBranchAvailability,
  fetchBranchBarbers,
  fetchBranchServices,
  joinCustomerQueue,
  type AppointmentResult,
  type BranchBarber,
  type BranchService,
  type QueueJoinResult,
} from '../../api/customer';
import { AppText } from '../../components/AppText';
import { useT } from '../../i18n';
import type { CustomerStackParamList } from '../../navigation/types';
import { useTheme } from '../../theme/ThemeProvider';
import {
  Avatar,
  Badge,
  BarberCard,
  BottomSheet,
  Button,
  Card,
  Divider,
  EmptyState,
  Input,
  OptionCard,
  Screen,
  ScreenHeader,
  SectionHeader,
  ServiceItem,
  SkeletonCard,
  StatusBadge,
  Stepper,
  getShadow,
  haptics,
  radius,
  spacing,
  useToast,
} from '../../ui';
import { formatCurrency } from '../../utils/format';

type Props = NativeStackScreenProps<CustomerStackParamList, 'Booking'>;

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

export function BookingScreen({ route, navigation }: Props) {
  const {
    branchId: initialBranchId,
    branchName: initialBranchName,
    businessName: initialBusinessName,
    address: initialAddress,
    phone: initialPhone,
    workingHours,
    preselectedBarberId,
    preselectedBarberName,
  } = route.params;

  const t = useT();
  const { colors } = useTheme();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [activeBranchId, setActiveBranchId] = useState(initialBranchId ?? '');
  const [activeBranchName, setActiveBranchName] = useState(initialBranchName ?? '');
  const [activeBusinessName, setActiveBusinessName] = useState(initialBusinessName ?? '');

  const [step, setStep] = useState<1 | 2 | 3>(preselectedBarberId ? 2 : 1);
  const [selectedBarberId, setSelectedBarberId] = useState<string | null>(
    preselectedBarberId ?? null,
  );
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const days = useMemo(() => getNext14Days(), []);
  const [selectedDate, setSelectedDate] = useState<string>(days[0].dateStr);
  const [selectedSlot, setSelectedSlot] = useState<{ time: string; start_at: string } | null>(null);
  const [notes, setNotes] = useState('');

  const [confirmedAppointment, setConfirmedAppointment] = useState<AppointmentResult | null>(null);
  const [confirmedQueue, setConfirmedQueue] = useState<QueueJoinResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const todayBranchQuery = useQuery({
    queryKey: ['barber-today-branch', preselectedBarberId],
    queryFn: () => fetchBarberTodayBranch(preselectedBarberId!),
    enabled: Boolean(preselectedBarberId),
  });

  useEffect(() => {
    if (todayBranchQuery.data) {
      setActiveBranchId(todayBranchQuery.data.branch_id);
      setActiveBranchName(todayBranchQuery.data.branch_name);
      setActiveBusinessName(todayBranchQuery.data.business_name);
    }
  }, [todayBranchQuery.data]);

  const servicesQuery = useQuery({
    queryKey: ['salon-branch-services', activeBranchId],
    queryFn: () => fetchBranchServices(activeBranchId),
  });

  const barbersQuery = useQuery({
    queryKey: ['salon-branch-barbers', activeBranchId],
    queryFn: () => fetchBranchBarbers(activeBranchId),
  });

  const availabilityQuery = useQuery({
    queryKey: [
      'salon-branch-availability',
      activeBranchId,
      selectedDate,
      selectedServiceIds.join(','),
      selectedBarberId ?? 'ANY',
    ],
    queryFn: () =>
      fetchBranchAvailability(
        activeBranchId,
        selectedDate,
        selectedServiceIds,
        selectedBarberId,
      ),
    enabled: step === 3 && selectedServiceIds.length > 0,
  });

  const services = servicesQuery.data?.services ?? [];
  const barbers = barbersQuery.data?.barbers ?? [];

  const availableServices = useMemo(() => {
    if (!selectedBarberId) return services;
    const barber = barbers.find((b) => b.id === selectedBarberId);
    if (!barber || !barber.offered_service_ids || barber.offered_service_ids.length === 0) {
      return services;
    }
    return services.filter((s) => barber.offered_service_ids.includes(s.id));
  }, [services, barbers, selectedBarberId]);

  const selectedServices = useMemo(
    () => availableServices.filter((s) => selectedServiceIds.includes(s.id)),
    [availableServices, selectedServiceIds],
  );

  const totalPrice = useMemo(
    () => selectedServices.reduce((acc, s) => acc + s.price, 0),
    [selectedServices],
  );

  const totalDuration = useMemo(
    () => selectedServices.reduce((acc, s) => acc + s.duration_minutes, 0),
    [selectedServices],
  );

  const selectedBarber = useMemo(
    () => barbers.find((b) => b.id === selectedBarberId) ?? null,
    [barbers, selectedBarberId],
  );

  const todayHoursInfo = useMemo(() => {
    if (!workingHours || workingHours.length === 0) return null;
    const dayOfWeek = new Date().getDay();
    const entry = workingHours.find((h) => h.day_of_week === dayOfWeek);
    if (!entry) return null;
    if (entry.is_closed) return { isClosed: true, label: t('booking.closedToday') };
    const openStr = entry.open_time.slice(0, 5);
    const closeStr = entry.close_time.slice(0, 5);
    return {
      isClosed: false,
      label: t('booking.openToday', { hours: `${openStr} – ${closeStr}` }),
    };
  }, [workingHours, t]);

  const toggleService = (id: string) => {
    setSelectedServiceIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
    setSelectedSlot(null);
  };

  const handleSelectBarber = (barberId: string | null) => {
    haptics.selection();
    setSelectedBarberId(barberId);
    setSelectedServiceIds([]);
    setSelectedSlot(null);
    setStep(2);
  };

  const bookAppointmentMutation = useMutation({
    mutationFn: () => {
      if (!selectedSlot) throw new Error('No slot selected');
      return createCustomerAppointment(activeBranchId, {
        barberId: selectedBarberId,
        serviceIds: selectedServiceIds,
        startAt: selectedSlot.start_at,
        bookingMode: selectedBarberId ? 'SPECIFIC' : 'ANY',
        notes: notes.trim() || undefined,
      });
    },
    onSuccess: (res) => {
      haptics.success();
      setErrorMessage(null);
      setConfirmedAppointment(res.appointment);
      queryClient.invalidateQueries({ queryKey: ['salon-branch-availability'] });
      queryClient.invalidateQueries({ queryKey: ['customer-appointments'] });
    },
    onError: (err: any) => {
      if (err?.status === 409) {
        setErrorMessage(t('booking.slotAlreadyBooked'));
        showToast({ title: t('booking.slotAlreadyBooked'), tone: 'error' });
        setSelectedSlot(null);
        void availabilityQuery.refetch();
      } else {
        setErrorMessage(err?.message || t('common.error.generic'));
      }
    },
  });

  const joinQueueMutation = useMutation({
    mutationFn: () =>
      joinCustomerQueue(activeBranchId, {
        barberId: selectedBarberId,
        serviceIds: selectedServiceIds,
      }),
    onSuccess: (res) => {
      haptics.success();
      setErrorMessage(null);
      setConfirmedQueue(res);
      queryClient.invalidateQueries({ queryKey: ['customer-active-queue'] });
    },
    onError: (err: any) => {
      setErrorMessage(err?.message || t('common.error.generic'));
      showToast({ title: err?.message || t('common.error.generic'), tone: 'error' });
    },
  });

  const isTodaySelected = selectedDate === days[0].dateStr;
  const avail = availabilityQuery.data;

  const stepLabels = [
    t('booking.stepBarber'),
    t('booking.stepService'),
    t('booking.stepDateTime'),
  ];

  const handleBack = () => {
    if (step === 3) setStep(2);
    else if (step === 2) setStep(1);
    else navigation.goBack();
  };

  return (
    <Screen scroll={false} padded={false}>
      <View style={styles.flex}>
        {/* Header + Salon Info Banner */}
        <View
          style={[
            styles.topContainer,
            { backgroundColor: colors.surface, borderBottomColor: colors.border },
          ]}
        >
          <ScreenHeader
            title={activeBusinessName}
            subtitle={activeBranchName}
            onBack={handleBack}
            rightAction={
              initialPhone ? (
                <Pressable
                  onPress={() => {
                    void Linking.openURL(`tel:${initialPhone}`);
                  }}
                  style={[
                    styles.callBtn,
                    { backgroundColor: colors.primaryLight, borderColor: colors.primaryBorder },
                  ]}
                >
                  <Ionicons name="call-outline" size={16} color={colors.primary} />
                  <AppText variant="label" style={{ color: colors.primary }}>
                    {t('booking.contactSalon')}
                  </AppText>
                </Pressable>
              ) : undefined
            }
          />

          {initialAddress || todayHoursInfo ? (
            <View style={styles.salonMetaStrip}>
              {initialAddress ? (
                <View style={styles.metaItem}>
                  <Ionicons name="location-outline" size={14} color={colors.textMuted} />
                  <AppText variant="caption" numberOfLines={1} style={{ flex: 1 }}>
                    {initialAddress}
                  </AppText>
                </View>
              ) : null}
              {todayHoursInfo ? (
                <StatusBadge
                  label={todayHoursInfo.label}
                  tone={todayHoursInfo.isClosed ? 'warning' : 'success'}
                  size="sm"
                />
              ) : null}
            </View>
          ) : null}

          <Stepper steps={stepLabels} currentStep={step - 1} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {errorMessage ? (
            <Card
              variant="outlined"
              padding="md"
              style={{ backgroundColor: colors.dangerLight, borderColor: colors.danger }}
            >
              <View style={styles.rowCenter}>
                <Ionicons name="alert-circle" size={18} color={colors.danger} />
                <AppText variant="caption" style={{ color: colors.danger, flex: 1 }}>
                  {errorMessage}
                </AppText>
              </View>
            </Card>
          ) : null}

          {/* STEP 1: BARBER SELECTION */}
          {step === 1 ? (
            <View style={styles.section}>
              <SectionHeader title={t('booking.selectBarber')} />

              <OptionCard
                title={t('booking.anyBarber')}
                subtitle={t('booking.anyBarberDesc')}
                selected={selectedBarberId === null}
                onPress={() => handleSelectBarber(null)}
                leftElement={
                  <View style={[styles.anyBarberAvatar, { backgroundColor: colors.primaryLight }]}>
                    <Ionicons name="people" size={24} color={colors.primary} />
                  </View>
                }
              />

              <AppText
                variant="label"
                style={{ color: colors.textSecondary, marginTop: spacing.sm }}
              >
                {t('booking.chooseSpecificBarber')}
              </AppText>

              {barbersQuery.isLoading ? (
                <View style={styles.stackMd}>
                  <SkeletonCard />
                  <SkeletonCard />
                </View>
              ) : (
                <View style={styles.stackSm}>
                  {barbers.map((barber: BranchBarber) => {
                    const isSelected = selectedBarberId === barber.id;
                    return (
                      <BarberCard
                        key={barber.id}
                        name={barber.name || t('term.barber')}
                        avatarUrl={barber.avatar_url}
                        rating={barber.avg_rating}
                        ratingCount={barber.rating_count}
                        isOnline={barber.is_working_today}
                        statusLabel={
                          barber.is_working_today
                            ? t('booking.workingToday')
                            : t('booking.notWorkingToday')
                        }
                        statusTone={barber.is_working_today ? 'success' : 'neutral'}
                        selected={isSelected}
                        onPress={() => handleSelectBarber(barber.id)}
                      />
                    );
                  })}
                </View>
              )}
            </View>
          ) : null}

          {/* STEP 2: MULTI-SERVICE SELECTION */}
          {step === 2 ? (
            <View style={styles.section}>
              <Card variant="subtle" padding="md">
                <View style={styles.rowBetween}>
                  <View style={styles.rowCenter}>
                    {selectedBarber ? (
                      <Avatar
                        name={selectedBarber.name || t('term.barber')}
                        uri={selectedBarber.avatar_url}
                        size="sm"
                      />
                    ) : (
                      <View
                        style={[
                          styles.anyBarberSmallIcon,
                          { backgroundColor: colors.primaryLight },
                        ]}
                      >
                        <Ionicons name="people" size={18} color={colors.primary} />
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <AppText variant="bodyBold">
                        {selectedBarber
                          ? selectedBarber.name || preselectedBarberName || t('term.barber')
                          : t('booking.anyBarber')}
                      </AppText>
                      <AppText variant="caption" style={{ color: colors.textMuted }}>
                        {t('booking.todaysLocation', { branch: activeBranchName })}
                      </AppText>
                    </View>
                  </View>
                  <Button
                    label={t('booking.change')}
                    variant="secondary"
                    size="sm"
                    fullWidth={false}
                    onPress={() => setStep(1)}
                  />
                </View>
              </Card>

              <SectionHeader
                title={t('booking.selectServices')}
                subtitle={t('booking.selectServicePrompt')}
                rightElement={
                  selectedServiceIds.length > 0 ? (
                    <Badge
                      label={t('booking.servicesSelected', { count: selectedServiceIds.length })}
                      tone="primary"
                      size="sm"
                    />
                  ) : undefined
                }
              />

              {servicesQuery.isLoading ? (
                <View style={styles.stackSm}>
                  <SkeletonCard />
                  <SkeletonCard />
                </View>
              ) : availableServices.length === 0 ? (
                <EmptyState
                  icon="cut-outline"
                  title={t('service.noServices')}
                />
              ) : (
                <View style={styles.stackSm}>
                  {availableServices.map((service: BranchService) => {
                    const isSelected = selectedServiceIds.includes(service.id);
                    return (
                      <ServiceItem
                        key={service.id}
                        name={service.name}
                        durationMinutes={service.duration_minutes}
                        durationLabel={t('booking.duration', { mins: service.duration_minutes })}
                        price={service.price}
                        selected={isSelected}
                        onPress={() => toggleService(service.id)}
                      />
                    );
                  })}
                </View>
              )}
            </View>
          ) : null}

          {/* STEP 3: DATE, LIVE QUEUE OR TIME SLOT */}
          {step === 3 ? (
            <View style={styles.section}>
              <SectionHeader title={t('booking.date')} />
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
                          backgroundColor: isSelected ? colors.primary : colors.surface,
                          borderColor: isSelected ? colors.primary : colors.border,
                        },
                      ]}
                    >
                      <AppText
                        variant="label"
                        style={{
                          color: isSelected ? colors.onPrimary : colors.textMuted,
                        }}
                      >
                        {d.isToday ? t('booking.today') : d.dayName}
                      </AppText>
                      <AppText
                        variant="heading2"
                        style={{
                          color: isSelected ? colors.onPrimary : colors.text,
                        }}
                      >
                        {d.dayNum}
                      </AppText>
                    </Pressable>
                  );
                })}
              </ScrollView>

              {/* Walk-in Live Queue Hero Option (Today Only) */}
              {isTodaySelected ? (
                <Card
                  variant={avail?.now_available ? 'selected' : 'outlined'}
                  padding="lg"
                  style={styles.walkinQueueHero}
                >
                  <View style={styles.rowCenter}>
                    <View
                      style={[
                        styles.flashIconCircle,
                        {
                          backgroundColor: avail?.now_available
                            ? colors.primary
                            : colors.inputBackground,
                        },
                      ]}
                    >
                      <Ionicons
                        name="flash"
                        size={22}
                        color={avail?.now_available ? colors.onPrimary : colors.textMuted}
                      />
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <AppText variant="heading3">{t('booking.nowJoinQueue')}</AppText>
                      <AppText variant="caption" style={{ color: colors.textSecondary }}>
                        {avail?.now_available
                          ? t('booking.nowJoinQueueDesc')
                          : t('booking.nowNotAvailable')}
                      </AppText>
                    </View>
                  </View>
                  <Button
                    label={t('booking.joinQueue')}
                    disabled={!avail?.now_available}
                    loading={joinQueueMutation.isPending}
                    onPress={() => joinQueueMutation.mutate()}
                    leftIcon="enter-outline"
                  />
                </Card>
              ) : null}

              {/* Scheduled Appointment Slots */}
              <SectionHeader title={t('booking.selectSlot')} />

              {availabilityQuery.isLoading ? (
                <SkeletonCard />
              ) : avail?.is_closed ? (
                <EmptyState icon="lock-closed-outline" title={t('booking.closed')} />
              ) : !avail?.slots || avail.slots.filter((s) => s.available).length === 0 ? (
                <EmptyState icon="calendar-outline" title={t('booking.noSlots')} />
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
                              backgroundColor: isSelected ? colors.primary : colors.surface,
                              borderColor: isSelected ? colors.primary : colors.border,
                            },
                          ]}
                        >
                          <AppText
                            variant="bodyBold"
                            style={{
                              color: isSelected ? colors.onPrimary : colors.text,
                            }}
                          >
                            {slot.time}
                          </AppText>
                        </Pressable>
                      );
                    })}
                </View>
              )}
            </View>
          ) : null}
        </ScrollView>

        {/* Sticky Bottom Summary Bar on Step 2 */}
        {step === 2 ? (
          <View
            style={[
              styles.bottomStickyBar,
              getShadow(colors, 'lg'),
              { backgroundColor: colors.surface, borderTopColor: colors.border },
            ]}
          >
            <View style={styles.rowBetween}>
              <View>
                <AppText variant="caption" style={{ color: colors.textMuted }}>
                  {t('booking.total')} • {t('booking.duration', { mins: totalDuration })}
                </AppText>
                <AppText variant="numeric" style={{ color: colors.primary }}>
                  {formatCurrency(totalPrice)}
                </AppText>
              </View>
              <Button
                label={t('booking.next')}
                disabled={selectedServiceIds.length === 0}
                fullWidth={false}
                rightIcon="arrow-forward"
                onPress={() => setStep(3)}
              />
            </View>
          </View>
        ) : null}

        {/* Review & Confirm Appointment Bottom Sheet */}
        <BottomSheet
          visible={step === 3 && Boolean(selectedSlot)}
          onClose={() => setSelectedSlot(null)}
          title={t('booking.summaryTitle')}
          subtitle={`${activeBusinessName} • ${activeBranchName}`}
          footer={
            <Button
              label={t('booking.confirmBooking')}
              loading={bookAppointmentMutation.isPending}
              onPress={() => bookAppointmentMutation.mutate()}
              leftIcon="checkmark-circle-outline"
            />
          }
        >
          {selectedSlot ? (
            <View style={styles.summarySheetBody}>
              <Card variant="subtle" padding="md">
                <View style={styles.summaryGrid}>
                  <View style={styles.summaryRow}>
                    <AppText variant="caption">{t('booking.barber')}</AppText>
                    <AppText variant="bodyBold">
                      {selectedBarber
                        ? selectedBarber.name || t('term.barber')
                        : t('booking.anyBarber')}
                    </AppText>
                  </View>
                  <Divider />
                  <View style={styles.summaryRow}>
                    <AppText variant="caption">{t('booking.date')}</AppText>
                    <AppText variant="bodyBold">{selectedDate}</AppText>
                  </View>
                  <Divider />
                  <View style={styles.summaryRow}>
                    <AppText variant="caption">{t('booking.time')}</AppText>
                    <AppText variant="bodyBold">{selectedSlot.time}</AppText>
                  </View>
                  <Divider />
                  <View style={styles.summaryRow}>
                    <AppText variant="caption">{t('booking.services')}</AppText>
                    <AppText
                      variant="bodyBold"
                      style={{ flex: 1, textAlign: 'right', marginLeft: spacing.md }}
                    >
                      {selectedServices.map((s) => s.name).join(', ')}
                    </AppText>
                  </View>
                  <Divider />
                  <View style={styles.summaryRow}>
                    <AppText variant="bodyBold">{t('booking.total')}</AppText>
                    <AppText variant="heading2" style={{ color: colors.primary }}>
                      {formatCurrency(totalPrice)}
                    </AppText>
                  </View>
                </View>
              </Card>

              <Input
                label={t('common.notes')}
                placeholder={t('booking.notesPlaceholder')}
                value={notes}
                onChangeText={setNotes}
              />
            </View>
          ) : null}
        </BottomSheet>

        {/* Appointment Confirmed Modal */}
        <Modal visible={Boolean(confirmedAppointment)} transparent animationType="fade">
          <View style={[styles.modalBackdrop, { backgroundColor: colors.overlay }]}>
            <View
              style={[
                styles.modalCard,
                getShadow(colors, 'lg'),
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <View style={[styles.successBadge, { backgroundColor: colors.successLight }]}>
                <Ionicons name="checkmark-circle" size={44} color={colors.success} />
              </View>
              <AppText variant="heading1" style={styles.textCenter}>
                {t('booking.confirmedTitle')}
              </AppText>
              <AppText variant="bodySmall" style={[styles.textCenter, { color: colors.textSecondary }]}>
                {t('booking.confirmedDesc')}
              </AppText>
              {confirmedAppointment ? (
                <Card variant="subtle" padding="md" style={{ width: '100%' }}>
                  <View style={{ alignItems: 'center', gap: 4 }}>
                    <AppText variant="bodyBold">
                      {t('booking.assignedBarber', { name: confirmedAppointment.barber_name })}
                    </AppText>
                    <AppText variant="caption" style={{ color: colors.textSecondary }}>
                      {selectedDate} • {selectedSlot?.time}
                    </AppText>
                    <AppText variant="heading3" style={{ color: colors.primary, marginTop: 4 }}>
                      {formatCurrency(confirmedAppointment.total_price)}
                    </AppText>
                  </View>
                </Card>
              ) : null}
              <View style={styles.modalActions}>
                <Button
                  label={t('booking.viewAppointments')}
                  onPress={() => {
                    setConfirmedAppointment(null);
                    navigation.navigate('CustomerTabs', { screen: 'AppointmentsTab' });
                  }}
                />
                <Button
                  label={t('booking.done')}
                  variant="secondary"
                  onPress={() => {
                    setConfirmedAppointment(null);
                    navigation.goBack();
                  }}
                />
              </View>
            </View>
          </View>
        </Modal>

        {/* Live Queue Joined Modal */}
        <Modal visible={Boolean(confirmedQueue)} transparent animationType="fade">
          <View style={[styles.modalBackdrop, { backgroundColor: colors.overlay }]}>
            <View
              style={[
                styles.modalCard,
                getShadow(colors, 'lg'),
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <View style={[styles.successBadge, { backgroundColor: colors.primaryLight }]}>
                <Ionicons name="ticket" size={40} color={colors.primary} />
              </View>
              <AppText variant="heading1" style={styles.textCenter}>
                {t('booking.queueJoinedTitle')}
              </AppText>
              {confirmedQueue ? (
                <View style={styles.tokenDisplayBox}>
                  <AppText variant="label" style={{ color: colors.textMuted }}>
                    {t('booking.yourToken')}
                  </AppText>
                  <AppText variant="display" style={{ color: colors.primary }}>
                    #{confirmedQueue.token}
                  </AppText>
                  <StatusBadge
                    label={t('booking.estimatedWait', {
                      time: confirmedQueue.estimated_wait_minutes,
                    })}
                    tone="primary"
                  />
                </View>
              ) : null}
              <View style={styles.modalActions}>
                <Button
                  label={t('waitScreen.inQueueCardView')}
                  onPress={() => {
                    setConfirmedQueue(null);
                    navigation.replace('CustomerWait');
                  }}
                />
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  topContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    gap: spacing.sm + 2,
  },
  salonMetaStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  callBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: 120,
    gap: spacing.lg,
  },
  section: {
    gap: spacing.md,
  },
  stackMd: {
    gap: spacing.md,
  },
  stackSm: {
    gap: spacing.sm + 2,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  rowCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  anyBarberAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  anyBarberSmallIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateScroll: {
    gap: spacing.sm,
    paddingVertical: 2,
  },
  dateChip: {
    width: 66,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    gap: 4,
  },
  walkinQueueHero: {
    gap: spacing.md,
  },
  flashIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  slotChip: {
    width: '31%',
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomStickyBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
  },
  summarySheetBody: {
    gap: spacing.md,
  },
  summaryGrid: {
    gap: spacing.sm + 2,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: radius.xxl,
    borderWidth: 1,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
  },
  successBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tokenDisplayBox: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },
  textCenter: {
    textAlign: 'center',
  },
  modalActions: {
    width: '100%',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
});
