import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  createCustomerAppointment,
  fetchBarberTodayBranch,
  fetchBranchAvailability,
  fetchBranchBarbers,
  fetchBranchServices,
  fetchSalons,
  joinCustomerQueue,
  type AppointmentResult,
  type BranchBarber,
  type BranchService,
  type QueueJoinResult,
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
  EmptyState,
  OptionCard,
  RatingBadge,
  Screen,
  Skeleton,
  Stepper,
  haptics,
  radius,
  spacing,
} from '../../ui';
import { formatCurrency } from '../../utils/format';

interface Props {
  navigation: {
    goBack: () => void;
    navigate: (screen: string, params?: any) => void;
  };
  route: {
    params?: {
      branchId?: string;
      preselectedBarberId?: string;
      initialStep?: 1 | 2;
    };
  };
}

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

export function BookingScreen({ navigation, route }: Props) {
  const t = useT();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const initialBranchId = route.params?.branchId;
  const preselectedBarberId = route.params?.preselectedBarberId;
  const initialStepParam = route.params?.initialStep ?? (preselectedBarberId ? 2 : 1);

  const [currentBranchId, setCurrentBranchId] = useState<string | null>(initialBranchId ?? null);
  const [step, setStep] = useState<1 | 2 | 3>(initialStepParam as 1 | 2 | 3);
  const [selectedBarberId, setSelectedBarberId] = useState<string | null>(preselectedBarberId ?? null);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  
  const sevenDays = useMemo(() => getNext7DaysColombo(), []);
  const [selectedDate, setSelectedDate] = useState<string>(sevenDays[0]?.dateStr ?? '');
  const [selectedSlot, setSelectedSlot] = useState<SlotAvailability | null>(null);
  const [isNowQueue, setIsNowQueue] = useState<boolean>(false);

  const [summaryVisible, setSummaryVisible] = useState(false);
  const [branchSelectorVisible, setBranchSelectorVisible] = useState(false);
  const [conflictError, setConflictError] = useState<string | null>(null);
  const [confirmedAppointment, setConfirmedAppointment] = useState<AppointmentResult | null>(null);
  const [queueToken, setQueueToken] = useState<QueueJoinResult | null>(null);

  // If entered via Barber Card without branchId, lookup barber's today branch
  const barberTodayBranchQuery = useQuery({
    queryKey: ['barber-today-branch', preselectedBarberId],
    queryFn: () => fetchBarberTodayBranch(preselectedBarberId!),
    enabled: !!preselectedBarberId && !initialBranchId,
  });

  useEffect(() => {
    if (barberTodayBranchQuery.data?.branch_id && !currentBranchId) {
      setCurrentBranchId(barberTodayBranchQuery.data.branch_id);
    }
  }, [barberTodayBranchQuery.data, currentBranchId]);

  // Salons list for branch name & branch selector
  const salonsQuery = useQuery({
    queryKey: ['customer-salons'],
    queryFn: () => fetchSalons(),
  });

  const activeSalon = useMemo(() => {
    return salonsQuery.data?.salons.find((s) => s.id === currentBranchId) ?? null;
  }, [salonsQuery.data, currentBranchId]);

  // Branch Barbers
  const barbersQuery = useQuery({
    queryKey: ['branch-barbers', currentBranchId],
    queryFn: () => fetchBranchBarbers(currentBranchId!),
    enabled: !!currentBranchId,
  });

  const barbers = barbersQuery.data?.barbers ?? [];
  const selectedBarber = useMemo(() => {
    return barbers.find((b) => b.id === selectedBarberId) ?? null;
  }, [barbers, selectedBarberId]);

  // Branch Services
  const servicesQuery = useQuery({
    queryKey: ['branch-services', currentBranchId],
    queryFn: () => fetchBranchServices(currentBranchId!),
    enabled: !!currentBranchId,
  });

  const allServices = servicesQuery.data?.services ?? [];

  // Filter services if selected barber has restricted services
  const availableServices = useMemo(() => {
    if (!selectedBarber || selectedBarber.offered_service_ids.length === 0) {
      return allServices;
    }
    return allServices.filter((s) => selectedBarber.offered_service_ids.includes(s.id));
  }, [allServices, selectedBarber]);

  // Totals
  const selectedServices = useMemo(() => {
    return allServices.filter((s) => selectedServiceIds.includes(s.id));
  }, [allServices, selectedServiceIds]);

  const totalDuration = useMemo(() => {
    return selectedServices.reduce((sum, s) => sum + s.duration_minutes, 0);
  }, [selectedServices]);

  const totalPrice = useMemo(() => {
    return selectedServices.reduce((sum, s) => sum + s.price, 0);
  }, [selectedServices]);

  // Availability Query
  const availabilityQuery = useQuery({
    queryKey: ['branch-availability', currentBranchId, selectedDate, selectedServiceIds, selectedBarberId],
    queryFn: () =>
      fetchBranchAvailability(
        currentBranchId!,
        selectedDate,
        selectedServiceIds,
        selectedBarberId,
      ),
    enabled: !!currentBranchId && !!selectedDate && step === 3,
  });

  const availability = availabilityQuery.data;

  // Toggle Service
  const toggleService = (serviceId: string) => {
    haptics.selection();
    setSelectedServiceIds((prev) =>
      prev.includes(serviceId) ? prev.filter((id) => id !== serviceId) : [...prev, serviceId],
    );
  };

  // Appointment Mutation
  const appointmentMutation = useMutation({
    mutationFn: () =>
      createCustomerAppointment(currentBranchId!, {
        barberId: selectedBarberId,
        serviceIds: selectedServiceIds,
        startAt: selectedSlot!.start_at,
        bookingMode: selectedBarberId ? 'SPECIFIC' : 'ANY',
      }),
    onSuccess: (data) => {
      haptics.success();
      setSummaryVisible(false);
      setConfirmedAppointment(data.appointment);
      queryClient.invalidateQueries({ queryKey: ['branch-availability'] });
    },
    onError: (err: any) => {
      haptics.medium();
      if (err?.code === 'SLOT_ALREADY_BOOKED' || err?.message?.includes('SLOT_ALREADY_BOOKED')) {
        setConflictError(t('booking.slotAlreadyBooked'));
        availabilityQuery.refetch();
      } else {
        setConflictError(err?.message || t('common.error.generic'));
      }
    },
  });

  // Live Queue Mutation
  const queueMutation = useMutation({
    mutationFn: () =>
      joinCustomerQueue(currentBranchId!, {
        barberId: selectedBarberId,
        serviceIds: selectedServiceIds,
      }),
    onSuccess: (data) => {
      haptics.success();
      setSummaryVisible(false);
      setQueueToken(data);
    },
    onError: (err: any) => {
      haptics.medium();
      setConflictError(err?.message || t('common.error.generic'));
    },
  });

  const handleBack = () => {
    haptics.light();
    if (step === 3) {
      setStep(2);
    } else if (step === 2) {
      setStep(1);
    } else {
      navigation.goBack();
    }
  };

  const handleNext = () => {
    haptics.light();
    if (step === 1) {
      setStep(2);
    } else if (step === 2) {
      if (selectedServiceIds.length === 0) return;
      setStep(3);
    }
  };

  const openSummary = (isNow: boolean) => {
    haptics.selection();
    setIsNowQueue(isNow);
    setConflictError(null);
    setSummaryVisible(true);
  };

  const handleConfirm = () => {
    if (isNowQueue) {
      queueMutation.mutate();
    } else {
      appointmentMutation.mutate();
    }
  };

  const stepLabels = [
    t('booking.stepBarber'),
    t('booking.stepService'),
    t('booking.stepDateTime'),
  ];

  return (
    <Screen scrollable={false} contentContainerStyle={styles.screenContainer}>
      {/* 1. Header Navigation Bar */}
      <View style={[styles.topNavBar, { paddingTop: insets.top + spacing.xs }]}>
        <TouchableOpacity
          onPress={handleBack}
          style={[styles.backBtn, { backgroundColor: colors.surface }]}
          accessibilityRole="button"
        >
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>

        <View style={styles.navTitles}>
          <AppText variant="heading" style={styles.navMainTitle} numberOfLines={1}>
            {activeSalon?.business_name || t('booking.title')}
          </AppText>
          <AppText variant="caption" style={{ color: colors.primary, fontWeight: '600' }} numberOfLines={1}>
            {activeSalon ? `${activeSalon.branch_name} • ${activeSalon.address}` : ''}
          </AppText>
        </View>

        <View style={{ width: 40 }} />
      </View>

      {/* 2. Stepper Indicator */}
      <View style={styles.stepperWrap}>
        <Stepper currentStep={step} totalSteps={3} steps={stepLabels} />
      </View>

      {/* 3. Step Content Body */}
      <ScrollView
        style={styles.stepContent}
        contentContainerStyle={[styles.stepScrollContent, { paddingBottom: 110 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* STEP 1: BARBER SELECTION */}
        {step === 1 && (
          <View style={styles.stepContainer}>
            <AppText variant="title" style={styles.stepTitle}>
              {t('booking.selectBarber')}
            </AppText>

            {/* Option 1: Any Barber (Default) */}
            <OptionCard
              title={t('booking.anyBarber')}
              subtitle={t('booking.anyBarberDesc')}
              selected={selectedBarberId === null}
              onPress={() => setSelectedBarberId(null)}
              icon={<Ionicons name="people" size={22} color={colors.onPrimary} />}
            />

            {/* Section: Specific Barbers */}
            <View style={styles.sectionHeaderRow}>
              <AppText variant="caption" style={[styles.sectionHeading, { color: colors.textMuted }]}>
                {t('booking.chooseSpecificBarber').toUpperCase()}
              </AppText>
            </View>

            {barbersQuery.isLoading ? (
              <View style={{ gap: spacing.sm }}>
                <Skeleton width="100%" height={74} borderRadius={radius.card} />
                <Skeleton width="100%" height={74} borderRadius={radius.card} />
              </View>
            ) : barbers.length === 0 ? (
              <EmptyState
                icon={<Ionicons name="people-outline" size={36} color={colors.textMuted} />}
                title={t('home.availableBarbers')}
                description={t('floor.noBarbersOnShift')}
              />
            ) : (
              barbers.map((barber) => {
                const isSelected = selectedBarberId === barber.id;
                return (
                  <Pressable
                    key={barber.id}
                    onPress={() => {
                      haptics.selection();
                      setSelectedBarberId(barber.id);
                    }}
                    style={[
                      styles.barberSelectCard,
                      {
                        backgroundColor: isSelected ? colors.primaryLight : colors.surface,
                        borderColor: isSelected ? colors.primary : colors.border,
                        borderWidth: isSelected ? 1.5 : 1,
                      },
                    ]}
                  >
                    <Avatar
                      name={barber.name}
                      shape="square"
                      size="md"
                      status={barber.is_working_today ? 'active' : undefined}
                    />

                    <View style={styles.barberInfoCol}>
                      <View style={styles.barberNameRow}>
                        <AppText variant="bodyBold" style={{ fontSize: 16 }}>
                          {barber.name}
                        </AppText>
                        <RatingBadge rating={barber.avg_rating} />
                      </View>

                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                        <Badge
                          label={barber.is_working_today ? t('booking.workingToday') : t('booking.notWorkingToday')}
                          variant={barber.is_working_today ? 'success' : 'neutral'}
                        />
                      </View>
                    </View>

                    <View
                      style={[
                        styles.radioCircle,
                        {
                          borderColor: isSelected ? colors.primary : colors.border,
                          backgroundColor: isSelected ? colors.primary : colors.surface,
                        },
                      ]}
                    >
                      {isSelected ? <Ionicons name="checkmark" size={14} color={colors.onPrimary} /> : null}
                    </View>
                  </Pressable>
                );
              })
            )}
          </View>
        )}

        {/* STEP 2: SERVICE SELECTION */}
        {step === 2 && (
          <View style={styles.stepContainer}>
            {/* Top Selected Barber Bar */}
            <View style={[styles.barberSummaryBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 }}>
                <Avatar
                  name={selectedBarber ? selectedBarber.name : t('booking.anyBarber')}
                  shape="square"
                  size="sm"
                  status={selectedBarber?.is_working_today ? 'active' : undefined}
                />
                <View style={{ flex: 1 }}>
                  <AppText variant="bodyBold" numberOfLines={1}>
                    {selectedBarber ? selectedBarber.name : t('booking.anyBarber')}
                  </AppText>
                  <AppText variant="caption" style={{ color: colors.textMuted }}>
                    {selectedBarber
                      ? selectedBarber.is_working_today
                        ? t('booking.workingToday')
                        : t('booking.notWorkingToday')
                      : t('booking.anyBarberDesc')}
                  </AppText>
                </View>
              </View>

              <TouchableOpacity
                onPress={() => {
                  haptics.light();
                  setStep(1);
                }}
                style={styles.changeBarberBtn}
              >
                <AppText variant="caption" style={{ color: colors.primary, fontWeight: '700' }}>
                  {t('booking.change')}
                </AppText>
              </TouchableOpacity>
            </View>

            {/* If entered via Barber Card, show today's branch banner */}
            {barberTodayBranchQuery.data && (
              <View
                style={[
                  styles.todayBranchBanner,
                  { backgroundColor: colors.primaryLight, borderColor: colors.primary },
                ]}
              >
                <Ionicons name="location-sharp" size={16} color={colors.primary} />
                <AppText variant="caption" style={{ flex: 1, color: colors.text, fontWeight: '600' }}>
                  {t('booking.todaysLocation', {
                    branch: `${barberTodayBranchQuery.data.business_name} - ${barberTodayBranchQuery.data.branch_name}`,
                  })}
                </AppText>
                <TouchableOpacity
                  onPress={() => {
                    haptics.light();
                    setBranchSelectorVisible(true);
                  }}
                >
                  <AppText variant="caption" style={{ color: colors.primary, fontWeight: '700' }}>
                    {t('booking.changeBranch')}
                  </AppText>
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.sectionHeaderRow}>
              <AppText variant="title" style={styles.stepTitle}>
                {t('booking.selectServices')}
              </AppText>
            </View>

            {servicesQuery.isLoading ? (
              <View style={{ gap: spacing.sm }}>
                <Skeleton width="100%" height={70} borderRadius={radius.input} />
                <Skeleton width="100%" height={70} borderRadius={radius.input} />
                <Skeleton width="100%" height={70} borderRadius={radius.input} />
              </View>
            ) : availableServices.length === 0 ? (
              <EmptyState
                icon={<Ionicons name="cut-outline" size={36} color={colors.textMuted} />}
                title={t('nav.services')}
                description={t('common.error.generic')}
              />
            ) : (
              availableServices.map((service) => {
                const isSelected = selectedServiceIds.includes(service.id);
                return (
                  <Pressable
                    key={service.id}
                    onPress={() => toggleService(service.id)}
                    style={[
                      styles.serviceItemCard,
                      {
                        backgroundColor: isSelected ? colors.primaryLight : colors.surface,
                        borderColor: isSelected ? colors.primary : colors.border,
                        borderWidth: isSelected ? 1.5 : 1,
                      },
                    ]}
                  >
                    <View style={{ flex: 1, gap: 4 }}>
                      <AppText variant="bodyBold" style={{ fontSize: 16 }}>
                        {service.name}
                      </AppText>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                        <AppText variant="caption" style={{ color: colors.textMuted }}>
                          {t('booking.duration', { mins: service.duration_minutes })}
                        </AppText>
                        <AppText variant="caption" style={{ color: colors.primary, fontWeight: '700' }}>
                          {formatCurrency(service.price)}
                        </AppText>
                      </View>
                    </View>

                    <View
                      style={[
                        styles.togglePill,
                        {
                          backgroundColor: isSelected ? colors.primary : colors.background,
                          borderColor: isSelected ? colors.primary : colors.border,
                        },
                      ]}
                    >
                      <Ionicons
                        name={isSelected ? 'checkmark' : 'add'}
                        size={18}
                        color={isSelected ? colors.onPrimary : colors.text}
                      />
                    </View>
                  </Pressable>
                );
              })
            )}
          </View>
        )}

        {/* STEP 3: DATE & TIME SELECTION */}
        {step === 3 && (
          <View style={styles.stepContainer}>
            {/* Services Recap Chip */}
            <View style={[styles.recapBanner, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={{ flex: 1 }}>
                <AppText variant="bodyBold" numberOfLines={1}>
                  {selectedServices.map((s) => s.name).join(', ')}
                </AppText>
                <AppText variant="caption" style={{ color: colors.textMuted }}>
                  {t('booking.duration', { mins: totalDuration })} • {formatCurrency(totalPrice)}
                </AppText>
              </View>
              <TouchableOpacity
                onPress={() => {
                  haptics.light();
                  setStep(2);
                }}
              >
                <AppText variant="caption" style={{ color: colors.primary, fontWeight: '700' }}>
                  {t('booking.change')}
                </AppText>
              </TouchableOpacity>
            </View>

            {/* Date Selection Horizontal Strip */}
            <AppText variant="bodyBold" style={{ fontSize: 16, marginTop: spacing.xs }}>
              {t('booking.date')}
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
                        fontSize: 18,
                        marginTop: 2,
                      }}
                    >
                      {day.dayNum}
                    </AppText>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* Check Closed Day */}
            {availability?.is_closed ? (
              <EmptyState
                icon={<Ionicons name="calendar-outline" size={36} color={colors.textMuted} />}
                title={t('booking.closed')}
                description={t('booking.noSlots')}
              />
            ) : (
              <>
                {/* Now — Join Live Queue Card (If Today) */}
                {selectedDate === sevenDays[0]?.dateStr && (
                  <View style={{ marginTop: spacing.sm }}>
                    <Pressable
                      disabled={!availability?.now_available}
                      onPress={() => openSummary(true)}
                      style={({ pressed }) => [
                        styles.nowQueueCard,
                        {
                          backgroundColor: availability?.now_available
                            ? colors.primaryLight
                            : colors.surface,
                          borderColor: availability?.now_available ? colors.primary : colors.border,
                          opacity: pressed ? 0.88 : availability?.now_available ? 1 : 0.6,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.nowQueueIconWrap,
                          {
                            backgroundColor: availability?.now_available
                              ? colors.primary
                              : colors.border,
                          },
                        ]}
                      >
                        <Ionicons name="flash" size={20} color={colors.onPrimary} />
                      </View>

                      <View style={{ flex: 1, gap: 2 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <AppText variant="bodyBold" style={{ fontSize: 16 }}>
                            {t('booking.nowJoinQueue')}
                          </AppText>
                          <Badge
                            label="LIVE"
                            variant={availability?.now_available ? 'success' : 'neutral'}
                          />
                        </View>
                        <AppText variant="caption" style={{ color: colors.textMuted }}>
                          {availability?.now_available
                            ? t('booking.nowJoinQueueDesc')
                            : t('booking.nowNotAvailable')}
                        </AppText>
                      </View>

                      <Ionicons
                        name="chevron-forward"
                        size={20}
                        color={availability?.now_available ? colors.primary : colors.textMuted}
                      />
                    </Pressable>
                  </View>
                )}

                {/* Time Slots Grid */}
                <View style={styles.sectionHeaderRow}>
                  <AppText variant="bodyBold" style={{ fontSize: 16 }}>
                    {t('booking.selectSlot')}
                  </AppText>
                </View>

                {availabilityQuery.isLoading ? (
                  <View style={styles.slotsGrid}>
                    {Array.from({ length: 8 }).map((_, i) => (
                      <Skeleton key={i} width="30%" height={46} borderRadius={radius.input} />
                    ))}
                  </View>
                ) : !availability?.slots || availability.slots.length === 0 ? (
                  <EmptyState
                    icon={<Ionicons name="time-outline" size={36} color={colors.textMuted} />}
                    title={t('booking.noSlots')}
                    description={t('booking.noSlots')}
                  />
                ) : (
                  <View style={styles.slotsGrid}>
                    {availability.slots.map((slot) => {
                      const isSelected = selectedSlot?.time === slot.time && !isNowQueue;
                      const isAvailable = slot.available;

                      return (
                        <Pressable
                          key={slot.time}
                          disabled={!isAvailable}
                          onPress={() => {
                            haptics.selection();
                            setIsNowQueue(false);
                            setSelectedSlot(slot);
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
                                : isAvailable
                                ? colors.border
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
                              fontSize: 14,
                            }}
                          >
                            {slot.time}
                          </AppText>
                        </Pressable>
                      );
                    })}
                  </View>
                )}
              </>
            )}
          </View>
        )}
      </ScrollView>

      {/* 4. Bottom Sticky Action Bar */}
      <View
        style={[
          styles.bottomActionBar,
          {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
            paddingBottom: insets.bottom + spacing.xs,
          },
        ]}
      >
        {step === 1 && (
          <Button
            label={t('booking.next')}
            onPress={handleNext}
            style={{ flex: 1 }}
          />
        )}

        {step === 2 && (
          <View style={styles.step2FooterRow}>
            <View>
              <AppText variant="caption" style={{ color: colors.textMuted }}>
                {t('booking.total')} ({t('booking.duration', { mins: totalDuration })})
              </AppText>
              <AppText variant="heading" style={{ color: colors.primary, fontSize: 20 }}>
                {formatCurrency(totalPrice)}
              </AppText>
            </View>

            <Button
              label={t('booking.next')}
              disabled={selectedServiceIds.length === 0}
              onPress={handleNext}
              style={{ minWidth: 140 }}
            />
          </View>
        )}

        {step === 3 && (
          <View style={styles.step3FooterRow}>
            <View style={{ flex: 1 }}>
              <AppText variant="caption" style={{ color: colors.textMuted }}>
                {isNowQueue
                  ? t('booking.nowJoinQueue')
                  : selectedSlot
                  ? `${selectedDate} @ ${selectedSlot.time}`
                  : t('booking.selectSlot')}
              </AppText>
              <AppText variant="heading" style={{ color: colors.primary, fontSize: 18 }}>
                {formatCurrency(totalPrice)}
              </AppText>
            </View>

            <Button
              label={t('booking.next')}
              disabled={!selectedSlot && !isNowQueue}
              onPress={() => openSummary(isNowQueue)}
              style={{ minWidth: 150 }}
            />
          </View>
        )}
      </View>

      {/* 5. Booking Summary BottomSheet */}
      <BottomSheet
        visible={summaryVisible}
        onClose={() => setSummaryVisible(false)}
        title={t('booking.summaryTitle')}
      >
        <View style={styles.summarySheetContent}>
          {conflictError && (
            <View style={[styles.conflictBanner, { backgroundColor: colors.background, borderColor: colors.danger }]}>
              <Ionicons name="alert-circle" size={18} color={colors.danger} />
              <AppText variant="caption" style={{ color: colors.danger, flex: 1, fontWeight: '600' }}>
                {conflictError}
              </AppText>
            </View>
          )}

          {/* Details Table */}
          <View style={[styles.summaryTable, { borderColor: colors.border }]}>
            {/* Salon */}
            <View style={[styles.summaryRow, { borderBottomColor: colors.border }]}>
              <AppText variant="caption" style={{ color: colors.textMuted, width: 80 }}>
                {t('booking.salon')}
              </AppText>
              <AppText variant="bodyBold" style={{ flex: 1 }}>
                {activeSalon?.business_name} ({activeSalon?.branch_name})
              </AppText>
            </View>

            {/* Barber */}
            <View style={[styles.summaryRow, { borderBottomColor: colors.border }]}>
              <AppText variant="caption" style={{ color: colors.textMuted, width: 80 }}>
                {t('booking.barber')}
              </AppText>
              <AppText variant="bodyBold" style={{ flex: 1 }}>
                {selectedBarber ? selectedBarber.name : t('booking.anyBarber')}
              </AppText>
            </View>

            {/* Date & Time */}
            <View style={[styles.summaryRow, { borderBottomColor: colors.border }]}>
              <AppText variant="caption" style={{ color: colors.textMuted, width: 80 }}>
                {t('booking.time')}
              </AppText>
              <AppText variant="bodyBold" style={{ flex: 1 }}>
                {isNowQueue
                  ? t('booking.nowJoinQueue')
                  : `${selectedDate} at ${selectedSlot?.time}`}
              </AppText>
            </View>

            {/* Services List */}
            <View style={[styles.summaryRow, { borderBottomWidth: 0, borderBottomColor: colors.border }]}>
              <AppText variant="caption" style={{ color: colors.textMuted, width: 80 }}>
                {t('booking.services')}
              </AppText>
              <View style={{ flex: 1, gap: 4 }}>
                {selectedServices.map((svc) => (
                  <View key={svc.id} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <AppText variant="body" style={{ fontSize: 14 }}>
                      {svc.name}
                    </AppText>
                    <AppText variant="bodyBold" style={{ fontSize: 14 }}>
                      {formatCurrency(svc.price)}
                    </AppText>
                  </View>
                ))}
              </View>
            </View>
          </View>

          {/* Total Row (Strictly No Booking Fee) */}
          <View style={[styles.totalRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <AppText variant="heading" style={{ fontSize: 18 }}>
              {t('booking.total')}
            </AppText>
            <AppText variant="title" style={{ color: colors.primary, fontSize: 22 }}>
              {formatCurrency(totalPrice)}
            </AppText>
          </View>

          {/* Action Button */}
          <Button
            label={isNowQueue ? t('booking.joinQueue') : t('booking.confirmBooking')}
            loading={appointmentMutation.isPending || queueMutation.isPending}
            onPress={handleConfirm}
            style={{ width: '100%', marginTop: spacing.sm }}
          />
        </View>
      </BottomSheet>

      {/* 6. Branch Selector BottomSheet (when changing branch for barber) */}
      <BottomSheet
        visible={branchSelectorVisible}
        onClose={() => setBranchSelectorVisible(false)}
        title={t('booking.changeBranch')}
      >
        <View style={{ gap: spacing.sm, paddingBottom: spacing.lg }}>
          {salonsQuery.data?.salons.map((salon) => (
            <Pressable
              key={salon.id}
              onPress={() => {
                haptics.selection();
                setCurrentBranchId(salon.id);
                setBranchSelectorVisible(false);
              }}
              style={[
                styles.branchSelectCard,
                {
                  backgroundColor: salon.id === currentBranchId ? colors.primaryLight : colors.surface,
                  borderColor: salon.id === currentBranchId ? colors.primary : colors.border,
                },
              ]}
            >
              <Ionicons name="location-sharp" size={18} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <AppText variant="bodyBold">{salon.business_name}</AppText>
                <AppText variant="caption" style={{ color: colors.textMuted }}>
                  {salon.branch_name} • {salon.address}
                </AppText>
              </View>
              {salon.id === currentBranchId && (
                <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
              )}
            </Pressable>
          ))}
        </View>
      </BottomSheet>

      {/* 7. Appointment Confirmed Modal */}
      {confirmedAppointment && (
        <Modal visible transparent animationType="fade">
          <View style={[styles.modalBackdrop, { backgroundColor: colors.overlay }]}>
            <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={[styles.modalIconWrap, { backgroundColor: colors.background }]}>
                <Ionicons name="checkmark-circle" size={48} color={colors.success} />
              </View>

              <AppText variant="title" style={{ textAlign: 'center', fontSize: 22 }}>
                {t('booking.confirmedTitle')}
              </AppText>

              <AppText variant="caption" style={{ textAlign: 'center', color: colors.textMuted }}>
                {t('booking.confirmedDesc')}
              </AppText>

              <View style={[styles.confirmedDetailsBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <AppText variant="bodyBold" style={{ color: colors.primary, textAlign: 'center' }}>
                  {t('booking.assignedBarber', { name: confirmedAppointment.barber_name })}
                </AppText>
                <AppText variant="caption" style={{ textAlign: 'center', color: colors.textMuted, marginTop: 4 }}>
                  {new Date(confirmedAppointment.start_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {formatCurrency(confirmedAppointment.total_price)}
                </AppText>
              </View>

              <View style={{ width: '100%', gap: spacing.sm, marginTop: spacing.md }}>
                <Button
                  label={t('booking.viewAppointments')}
                  onPress={() => {
                    setConfirmedAppointment(null);
                    navigation.navigate('CustomerTabs', { screen: 'Appointments' });
                  }}
                />
                <Button
                  label={t('booking.done')}
                  variant="ghost"
                  onPress={() => {
                    setConfirmedAppointment(null);
                    navigation.goBack();
                  }}
                />
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* 8. Live Queue Joined Modal */}
      {queueToken && (
        <Modal visible transparent animationType="fade">
          <View style={[styles.modalBackdrop, { backgroundColor: colors.overlay }]}>
            <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={[styles.modalIconWrap, { backgroundColor: colors.primaryLight }]}>
                <Ionicons name="ticket" size={48} color={colors.primary} />
              </View>

              <AppText variant="title" style={{ textAlign: 'center', fontSize: 22 }}>
                {t('booking.queueJoinedTitle')}
              </AppText>

              <View style={[styles.tokenLargeBox, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}>
                <AppText variant="caption" style={{ color: colors.primary, fontWeight: '700' }}>
                  {t('booking.yourToken')}
                </AppText>
                <AppText variant="title" style={{ color: colors.primary, fontSize: 36, letterSpacing: 2 }}>
                  {queueToken.token}
                </AppText>
              </View>

              <AppText variant="bodyBold" style={{ textAlign: 'center', color: colors.text }}>
                {t('booking.estimatedWait', { time: queueToken.estimated_wait_minutes })}
              </AppText>

              <Button
                label={t('booking.done')}
                onPress={() => {
                  setQueueToken(null);
                  navigation.navigate('CustomerWait');
                }}
                style={{ width: '100%', marginTop: spacing.md }}
              />
            </View>
          </View>
        </Modal>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
  },
  topNavBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xs,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  navTitles: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
  },
  navMainTitle: {
    fontSize: 17,
  },
  stepperWrap: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xs,
  },
  stepContent: {
    flex: 1,
  },
  stepScrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
  },
  stepContainer: {
    gap: spacing.md,
  },
  stepTitle: {
    fontSize: 20,
    letterSpacing: -0.3,
  },
  sectionHeaderRow: {
    marginTop: spacing.xs,
  },
  sectionHeading: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  barberSelectCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.card,
    gap: spacing.md,
  },
  barberInfoCol: {
    flex: 1,
  },
  barberNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: radius.full,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  barberSummaryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: radius.input,
    borderWidth: 1,
  },
  changeBarberBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  todayBranchBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.input,
    borderWidth: 1,
    gap: spacing.sm,
  },
  serviceItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.input,
    gap: spacing.md,
  },
  togglePill: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recapBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: radius.input,
    borderWidth: 1,
  },
  dateChipsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  dateChip: {
    minWidth: 70,
    height: 70,
    borderRadius: radius.input,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  nowQueueCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.card,
    borderWidth: 1.5,
    gap: spacing.md,
  },
  nowQueueIconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  slotItem: {
    width: '31%',
    height: 46,
    borderRadius: radius.input,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomActionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
  },
  step2FooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  step3FooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  summarySheetContent: {
    gap: spacing.md,
    paddingBottom: spacing.lg,
  },
  conflictBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.input,
    borderWidth: 1,
    gap: spacing.sm,
  },
  summaryTable: {
    borderWidth: 1,
    borderRadius: radius.input,
    overflow: 'hidden',
  },
  summaryRow: {
    flexDirection: 'row',
    padding: spacing.md,
    borderBottomWidth: 1,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: radius.input,
    borderWidth: 1,
  },
  branchSelectCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.input,
    borderWidth: 1,
    gap: spacing.md,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  modalCard: {
    width: '100%',
    borderRadius: radius.card,
    padding: spacing.xl,
    borderWidth: 1,
    alignItems: 'center',
    gap: spacing.sm,
  },
  modalIconWrap: {
    width: 72,
    height: 72,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  confirmedDetailsBox: {
    width: '100%',
    padding: spacing.md,
    borderRadius: radius.input,
    borderWidth: 1,
    marginTop: spacing.sm,
  },
  tokenLargeBox: {
    width: '100%',
    padding: spacing.lg,
    borderRadius: radius.card,
    borderWidth: 2,
    alignItems: 'center',
    marginVertical: spacing.sm,
  },
});
