import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { fetchServices } from '../../api/owner';
import { addWalkIn, fetchBranchLiveFloor, fetchWaitTimes } from '../../api/receptionist';
import { AppText } from '../../components/AppText';
import { useT } from '../../i18n';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { useTheme } from '../../theme/ThemeProvider';
import {
  Avatar,
  BottomSheet,
  Button,
  Card,
  Input,
  OptionCard,
  RatingBadge,
  Screen,
  Stepper,
  haptics,
  radius,
  spacing,
  typography,
} from '../../ui';
import { formatCurrency, formatDuration } from '../../utils/format';
import { WalkInSuccessModal } from './WalkInSuccessModal';

interface Props {
  route?: {
    params?: {
      branchId?: string;
      preselectedBarberId?: string;
    };
  };
  navigation: {
    goBack: () => void;
  };
}

export function AddWalkInScreen({ route, navigation }: Props) {
  const activeBranchId =
    useWorkspaceStore((s) => s.activeBranchId) ??
    useWorkspaceStore((s) => s.activeWorkspace?.branch_id);
  const branchId = route?.params?.branchId ?? activeBranchId ?? '';
  const preselectedBarberId = route?.params?.preselectedBarberId;
  const t = useT();
  const { colors } = useTheme();
  const queryClient = useQueryClient();

  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [mode, setMode] = useState<'ANONYMOUS' | 'VERIFIED'>('ANONYMOUS');
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [selectedBarberId, setSelectedBarberId] = useState<string | null>(
    preselectedBarberId ?? null,
  );
  const [favoriteBarbers, setFavoriteBarbers] = useState<Record<string, boolean>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{
    token: string;
    name?: string | null;
    wait: number;
  } | null>(null);

  const servicesQuery = useQuery({
    queryKey: ['services', branchId],
    queryFn: () => fetchServices(branchId),
    enabled: Boolean(branchId),
  });

  const liveFloorQuery = useQuery({
    queryKey: ['live-floor', branchId],
    queryFn: () => fetchBranchLiveFloor(branchId),
    enabled: Boolean(branchId),
  });

  const waitTimesQuery = useQuery({
    queryKey: ['wait-times', branchId],
    queryFn: () => fetchWaitTimes(branchId),
    refetchInterval: 15000,
    enabled: Boolean(branchId),
  });

  const addWalkInMutation = useMutation({
    mutationFn: () =>
      addWalkIn(branchId, {
        mode,
        customerName: customerName.trim() || undefined,
        phone: mode === 'VERIFIED' ? phone.trim() : undefined,
        serviceIds: selectedServiceIds,
        barberId: selectedBarberId,
      }),
    onSuccess: (data) => {
      setShowSummaryModal(false);
      queryClient.invalidateQueries({ queryKey: ['live-floor', branchId] });
      queryClient.invalidateQueries({ queryKey: ['barber-queue', branchId] });
      queryClient.invalidateQueries({ queryKey: ['wait-times', branchId] });
      setSuccessData({
        token: data.token,
        name: customerName.trim() || null,
        wait: data.estimated_wait_minutes,
      });
    },
    onError: (err: any) => {
      setFormError(err?.message || t('common.error.generic'));
    },
  });

  const toggleService = (serviceId: string) => {
    haptics.selection();
    setSelectedServiceIds((prev) =>
      prev.includes(serviceId)
        ? prev.filter((id) => id !== serviceId)
        : [...prev, serviceId],
    );
    setFormError(null);
  };

  const toggleBarberFavorite = (barberId: string) => {
    haptics.light();
    setFavoriteBarbers((prev) => ({ ...prev, [barberId]: !prev[barberId] }));
  };

  const handleSubmit = () => {
    setFormError(null);
    if (selectedServiceIds.length === 0) {
      setFormError(t('walkin.selectServices'));
      return;
    }
    if (mode === 'VERIFIED' && !phone.trim()) {
      setFormError(t('phone.required'));
      return;
    }

    addWalkInMutation.mutate();
  };

  const onShiftBarbers =
    liveFloorQuery.data?.barbers.filter(
      (b) => b.shift_status === 'ACTIVE' || b.shift_status === 'PAUSED',
    ) ?? [];

  const selectedBarber = onShiftBarbers.find((b) => b.barber_id === selectedBarberId);
  const services = servicesQuery.data ?? [];
  const selectedServices = services.filter((s) => selectedServiceIds.includes(s.id));
  const totalServicesPrice = selectedServices.reduce((sum, s) => sum + s.price, 0);

  const steps = [
    t('walkin.stepBarber'),
    t('walkin.stepService'),
    t('walkin.stepSummary'),
  ];

  return (
    <Screen contentContainerStyle={styles.screen}>
      {/* 1. Header with Back button, Salon Title/Location and Bookmark Rating Badge */}
      <View style={styles.topHeader}>
        <TouchableOpacity
          onPress={() => {
            haptics.light();
            if (currentStep === 2) {
              setCurrentStep(1);
            } else {
              navigation.goBack();
            }
          }}
          style={[
            styles.backBtn,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </TouchableOpacity>

        <View style={styles.headerTitleWrap}>
          <AppText style={[styles.salonTitle, { color: colors.text }]} numberOfLines={1}>
            Kasun’s Salon
          </AppText>
          <View style={styles.locationRow}>
            <Ionicons name="location-sharp" size={13} color={colors.primary} />
            <AppText variant="caption" style={{ color: colors.textMuted }}>
              Colombo Branch
            </AppText>
          </View>
        </View>

        <RatingBadge variant="bookmark" rating="4.7" reviewsCount={398} />
      </View>

      {/* 2. 3-Step Stepper Progress Bar */}
      <View style={styles.stepperContainer}>
        <Stepper
          currentStep={currentStep}
          totalSteps={3}
          steps={steps}
        />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* STEP 1: Barber Selection */}
        {currentStep === 1 && (
          <View style={{ gap: spacing.lg }}>
            {/* Mode Switcher: Anonymous vs Verified */}
            <View
              style={[
                styles.modeContainer,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <TouchableOpacity
                onPress={() => {
                  haptics.selection();
                  setMode('ANONYMOUS');
                  setFormError(null);
                }}
                style={[
                  styles.modeTab,
                  {
                    backgroundColor:
                      mode === 'ANONYMOUS' ? colors.primary : colors.surface,
                  },
                ]}
              >
                <AppText
                  style={{
                    color: mode === 'ANONYMOUS' ? colors.onPrimary : colors.text,
                    fontWeight: '700',
                    fontSize: 13,
                  }}
                >
                  {t('walkin.modeAnon')}
                </AppText>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  haptics.selection();
                  setMode('VERIFIED');
                  setFormError(null);
                }}
                style={[
                  styles.modeTab,
                  {
                    backgroundColor:
                      mode === 'VERIFIED' ? colors.primary : colors.surface,
                  },
                ]}
              >
                <AppText
                  style={{
                    color: mode === 'VERIFIED' ? colors.onPrimary : colors.text,
                    fontWeight: '700',
                    fontSize: 13,
                  }}
                >
                  {t('walkin.modeVerified')}
                </AppText>
              </TouchableOpacity>
            </View>

            {/* Choose Any Barber Section */}
            <View style={{ gap: spacing.sm }}>
              <AppText style={[styles.sectionTrackedTitle, { color: colors.textMuted }]}>
                {t('walkin.chooseAnyBarber').toUpperCase()}
              </AppText>

              <OptionCard
                icon="people"
                title={t('walkin.anyBarber')}
                subtitle={t('walkin.anyBarberDesc')}
                selected={selectedBarberId === null}
                onPress={() => {
                  haptics.selection();
                  setSelectedBarberId(null);
                }}
              />
            </View>

            {/* Choose Specific Barber Section */}
            <View style={{ gap: spacing.sm }}>
              <AppText style={[styles.sectionTrackedTitle, { color: colors.textMuted }]}>
                {t('walkin.chooseSpecificBarber').toUpperCase()}
              </AppText>

              {onShiftBarbers.map((barber) => {
                const isSelected = selectedBarberId === barber.barber_id;
                const waitMins =
                  waitTimesQuery.data?.barber_wait_times[barber.barber_id] ?? 0;

                return (
                  <Card
                    key={barber.barber_id}
                    highlighted={isSelected}
                    onPress={() => {
                      haptics.selection();
                      setSelectedBarberId(barber.barber_id);
                    }}
                    style={styles.barberCard}
                  >
                    <View style={styles.barberCardRow}>
                      <Avatar
                        name={barber.name || barber.phone}
                        size="lg"
                        shape="square"
                        status="active"
                      />

                      <View style={styles.barberDetails}>
                        <AppText style={[styles.barberName, { color: colors.text }]}>
                          {barber.name || barber.phone}
                        </AppText>
                        <View style={styles.metaRow}>
                          <AppText style={[styles.starSymbol, { color: colors.primary }]}>
                            ★
                          </AppText>
                          <AppText
                            variant="caption"
                            style={{ color: colors.textMuted, fontWeight: '700' }}
                          >
                            4.7 (50 reviews)
                          </AppText>
                        </View>
                        <View style={styles.metaRow}>
                          <Ionicons name="time-outline" size={13} color={colors.textMuted} />
                          <AppText variant="caption" style={{ color: colors.textMuted }}>
                            {waitMins > 0 ? `${waitMins}m wait` : t('walkin.availableToday')}
                          </AppText>
                        </View>
                      </View>

                      <TouchableOpacity
                        onPress={() => toggleBarberFavorite(barber.barber_id)}
                        style={styles.heartBtn}
                      >
                        <Ionicons
                          name={favoriteBarbers[barber.barber_id] ? 'heart' : 'heart-outline'}
                          size={22}
                          color={
                            favoriteBarbers[barber.barber_id]
                              ? colors.primary
                              : colors.textMuted
                          }
                        />
                      </TouchableOpacity>
                    </View>
                  </Card>
                );
              })}
            </View>
          </View>
        )}

        {/* STEP 2: Service Selection & Customer Info */}
        {currentStep === 2 && (
          <View style={{ gap: spacing.lg }}>
            {/* Selected Barber Header Summary Card */}
            <Card style={styles.selectedBarberCard}>
              <View style={styles.selectedBarberRow}>
                <View
                  style={[
                    styles.barberIconBox,
                    { backgroundColor: colors.primaryLight },
                  ]}
                >
                  <Ionicons
                    name={selectedBarberId ? 'person' : 'people'}
                    size={20}
                    color={colors.primary}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <AppText style={[styles.selectedBarberTitle, { color: colors.text }]}>
                    {selectedBarber
                      ? selectedBarber.name || selectedBarber.phone
                      : t('walkin.anyBarber')}
                  </AppText>
                  <AppText variant="caption" style={{ color: colors.textMuted }}>
                    {selectedBarberId
                      ? t('walkin.availableToday')
                      : t('walkin.anyBarberDesc')}
                  </AppText>
                </View>

                <TouchableOpacity
                  onPress={() => {
                    haptics.light();
                    setCurrentStep(1);
                  }}
                  style={[
                    styles.changePill,
                    {
                      backgroundColor: colors.primaryLight,
                      borderColor: colors.primaryBorder,
                    },
                  ]}
                >
                  <AppText style={[styles.changeText, { color: colors.primary }]}>
                    {t('walkin.change')}
                  </AppText>
                </TouchableOpacity>
              </View>
            </Card>

            {/* Customer Details Input Card */}
            <Card style={styles.customerCard}>
              <Input
                label={t('walkin.customerName')}
                value={customerName}
                onChangeText={(val) => {
                  setCustomerName(val);
                  setFormError(null);
                }}
                placeholder="e.g. Kasun"
              />

              {mode === 'VERIFIED' ? (
                <Input
                  label={t('walkin.customerPhone')}
                  value={phone}
                  onChangeText={(val) => {
                    setPhone(val);
                    setFormError(null);
                  }}
                  placeholder="07X XXX XXXX"
                  keyboardType="phone-pad"
                />
              ) : null}
            </Card>

            {/* Services List Section */}
            <View style={{ gap: spacing.sm }}>
              <AppText style={[styles.sectionTrackedTitle, { color: colors.textMuted }]}>
                {t('walkin.chooseServices').toUpperCase()}
              </AppText>
              <AppText style={[styles.categoryHeader, { color: colors.primary }]}>
                {t('walkin.hairServices').toUpperCase()}
              </AppText>

              {services.map((service) => {
                const isSelected = selectedServiceIds.includes(service.id);
                return (
                  <Card
                    key={service.id}
                    highlighted={isSelected}
                    onPress={() => toggleService(service.id)}
                    style={styles.serviceCard}
                  >
                    <View style={styles.serviceRow}>
                      <View style={{ flex: 1, gap: 4 }}>
                        <AppText style={[styles.serviceTitle, { color: colors.text }]}>
                          {service.name}
                        </AppText>
                        <View style={styles.metaRow}>
                          <Ionicons
                            name="time-outline"
                            size={13}
                            color={colors.textMuted}
                          />
                          <AppText variant="caption" style={{ color: colors.textMuted }}>
                            {formatDuration(service.duration_minutes)}
                          </AppText>
                        </View>
                      </View>

                      <View style={styles.servicePriceWrap}>
                        <AppText style={[styles.servicePriceText, { color: colors.text }]}>
                          {formatCurrency(service.price)}
                        </AppText>

                        <View
                          style={[
                            styles.serviceToggleBtn,
                            {
                              backgroundColor: isSelected
                                ? colors.primary
                                : colors.background,
                              borderColor: isSelected ? colors.primary : colors.border,
                            },
                          ]}
                        >
                          <Ionicons
                            name={isSelected ? 'checkmark' : 'add'}
                            size={16}
                            color={isSelected ? colors.onPrimary : colors.textMuted}
                          />
                        </View>
                      </View>
                    </View>
                  </Card>
                );
              })}
            </View>
          </View>
        )}

        {formError ? (
          <AppText variant="error" style={{ textAlign: 'center', marginTop: spacing.sm }}>
            {formError}
          </AppText>
        ) : null}
      </ScrollView>

      {/* 3. Sticky Bottom Action Bar with Next › button */}
      <View
        style={[
          styles.stickyFooter,
          { backgroundColor: colors.surface, borderTopColor: colors.border },
        ]}
      >
        {currentStep === 1 ? (
          <Button
            label={t('walkin.next')}
            onPress={() => {
              haptics.light();
              setCurrentStep(2);
            }}
          />
        ) : (
          <Button
            label={t('walkin.next')}
            onPress={() => {
              haptics.light();
              if (selectedServiceIds.length === 0) {
                setFormError(t('walkin.selectServices'));
                return;
              }
              setShowSummaryModal(true);
            }}
            disabled={selectedServiceIds.length === 0}
          />
        )}
      </View>

      {/* 4. Step 3: Booking Summary BottomSheet Modal */}
      <BottomSheet
        visible={showSummaryModal}
        onClose={() => setShowSummaryModal(false)}
        title={t('walkin.bookingSummary')}
      >
        <View style={styles.summaryModalContent}>
          {/* Light-blue Summary Box */}
          <View
            style={[
              styles.summaryBox,
              {
                backgroundColor: colors.primaryLight,
                borderColor: colors.primaryBorder,
              },
            ]}
          >
            <View style={styles.summaryLine}>
              <AppText style={[styles.summaryLabel, { color: colors.textMuted }]}>
                {t('walkin.selectedServicesFee')}
              </AppText>
              <AppText style={[styles.summaryValue, { color: colors.text }]}>
                {formatCurrency(totalServicesPrice)}
              </AppText>
            </View>

            <View style={styles.summaryLine}>
              <AppText style={[styles.summaryLabel, { color: colors.textMuted }]}>
                {t('walkin.bookingFee')}
              </AppText>
              <AppText style={[styles.summaryValue, { color: colors.text }]}>
                Rs. 0
              </AppText>
            </View>

            <View
              style={[
                styles.summaryDivider,
                { backgroundColor: colors.primaryBorder },
              ]}
            />

            <View style={styles.summaryLine}>
              <AppText style={[styles.summaryTotalLabel, { color: colors.primary }]}>
                {t('walkin.totalAmount')}
              </AppText>
              <AppText style={[styles.summaryTotalValue, { color: colors.primary }]}>
                {formatCurrency(totalServicesPrice)}
              </AppText>
            </View>
          </View>

          {/* Important Note Warning Box */}
          <View style={styles.noteContainer}>
            <AppText style={[styles.noteTitle, { color: colors.danger }]}>
              {t('walkin.importantNote')}
            </AppText>
            <AppText style={[styles.noteDesc, { color: colors.danger }]}>
              {t('walkin.importantNoteDesc')}
            </AppText>
          </View>

          {/* Confirm Button */}
          <Button
            label={t('walkin.confirmBooking')}
            onPress={handleSubmit}
            loading={addWalkInMutation.isPending}
          />
        </View>
      </BottomSheet>

      {/* 5. Success Modal with Token */}
      {successData ? (
        <WalkInSuccessModal
          visible={Boolean(successData)}
          token={successData.token}
          customerName={successData.name}
          estimatedWaitMinutes={successData.wait}
          onDismiss={() => {
            setSuccessData(null);
            navigation.goBack();
          }}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    paddingHorizontal: 0,
    flex: 1,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  headerTitleWrap: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
  },
  salonTitle: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
  },
  stepperContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xs,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: 100,
  },
  modeContainer: {
    flexDirection: 'row',
    borderRadius: radius.pill,
    borderWidth: 1,
    padding: 3,
  },
  modeTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTrackedTitle: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  categoryHeader: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1.0,
    marginBottom: spacing.xs,
  },
  barberCard: {
    padding: spacing.md,
  },
  barberCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  barberDetails: {
    flex: 1,
    gap: 3,
  },
  barberName: {
    fontSize: 15,
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  starSymbol: {
    fontSize: 13,
    fontWeight: '800',
  },
  heartBtn: {
    padding: spacing.xs,
  },
  selectedBarberCard: {
    padding: spacing.md,
  },
  selectedBarberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  barberIconBox: {
    width: 40,
    height: 40,
    borderRadius: radius.input,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedBarberTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  changePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  changeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  customerCard: {
    padding: spacing.md,
    gap: spacing.md,
  },
  serviceCard: {
    padding: spacing.md,
  },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  serviceTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  servicePriceWrap: {
    alignItems: 'flex-end',
    gap: 6,
  },
  servicePriceText: {
    fontSize: 14,
    fontWeight: '700',
  },
  serviceToggleBtn: {
    width: 26,
    height: 26,
    borderRadius: radius.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stickyFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    borderTopWidth: 1,
  },
  summaryModalContent: {
    gap: spacing.lg,
    paddingBottom: spacing.lg,
  },
  summaryBox: {
    borderRadius: radius.card,
    borderWidth: 1,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  summaryLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  summaryDivider: {
    height: 1,
    marginVertical: spacing.xs,
  },
  summaryTotalLabel: {
    fontSize: 16,
    fontWeight: '800',
  },
  summaryTotalValue: {
    fontSize: 17,
    fontWeight: '800',
  },
  noteContainer: {
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
  },
  noteTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  noteDesc: {
    fontSize: 12,
    textAlign: 'center',
  },
});
