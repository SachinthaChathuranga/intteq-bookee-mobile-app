import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { fetchServices, type Service } from '../../api/owner';
import { addWalkIn, fetchBranchLiveFloor, type BarberFloorState } from '../../api/receptionist';
import { AppText } from '../../components/AppText';
import { useT } from '../../i18n';
import type { ReceptionistStackParamList } from '../../navigation/types';
import { WorkspaceHeader } from '../../navigation/workspaces/WorkspaceHeader';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { useTheme } from '../../theme/ThemeProvider';
import {
  Avatar,
  Badge,
  Button,
  Card,
  Divider,
  EmptyState,
  Input,
  OptionCard,
  Screen,
  SectionHeader,
  SegmentedControl,
  ServiceItem,
  StatusBadge,
  Stepper,
  getShadow,
  haptics,
  spacing,
} from '../../ui';
import { formatCurrency } from '../../utils/format';

type Props = NativeStackScreenProps<ReceptionistStackParamList, 'AddWalkIn'>;

export function AddWalkInScreen({ navigation }: Props) {
  const t = useT();
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const activeWorkspace = useWorkspaceStore((s) => s.activeWorkspace);
  const branchId = activeWorkspace?.branch_id;

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [mode, setMode] = useState<'ANONYMOUS' | 'VERIFIED'>('ANONYMOUS');
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [selectedBarberId, setSelectedBarberId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const servicesQuery = useQuery({
    queryKey: ['services', branchId],
    queryFn: () => fetchServices(branchId!),
    enabled: Boolean(branchId),
  });

  const floorQuery = useQuery({
    queryKey: ['live-floor', branchId],
    queryFn: () => fetchBranchLiveFloor(branchId!),
    enabled: Boolean(branchId),
  });

  const walkInMutation = useMutation({
    mutationFn: async () => {
      if (selectedServiceIds.length === 0) {
        throw new Error(t('booking.selectServicePrompt'));
      }
      if (mode === 'VERIFIED' && !phone.trim()) {
        throw new Error(t('phone.required'));
      }
      return await addWalkIn(branchId!, {
        mode,
        customerName: customerName.trim() || undefined,
        phone: mode === 'VERIFIED' ? phone.trim() : undefined,
        serviceIds: selectedServiceIds,
        barberId: selectedBarberId,
      });
    },
    onSuccess: (data) => {
      haptics.success();
      queryClient.invalidateQueries({ queryKey: ['live-floor', branchId] });
      navigation.replace('WalkInSuccess', {
        token: data.token,
        estimatedWaitMinutes: data.estimated_wait_minutes,
        customerName:
          data.entry.customer_name || data.entry.walk_in_name || 'Walk-in',
      });
    },
    onError: (err: any) => {
      setError(err?.message || t('common.error.generic'));
    },
  });

  const toggleService = (id: string) => {
    setSelectedServiceIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );
    setError(null);
  };

  const activeServices = (servicesQuery.data ?? []).filter((s) => s.is_active);
  const barbers = floorQuery.data?.barbers ?? [];
  const generalWait = floorQuery.data?.wait_times?.general_wait_minutes ?? 0;

  const selectedServicesList = activeServices.filter((s) =>
    selectedServiceIds.includes(s.id),
  );
  const totalFee = selectedServicesList.reduce((acc, s) => acc + s.price, 0);
  const totalDuration = selectedServicesList.reduce(
    (acc, s) => acc + s.duration_minutes,
    0,
  );

  const selectedBarberObj = barbers.find((b) => b.barber_id === selectedBarberId);

  const handleBack = () => {
    if (step === 3) setStep(2);
    else if (step === 2) setStep(1);
    else if (navigation.canGoBack()) navigation.goBack();
  };

  const stepLabels = [
    t('walkin.stepBarber'),
    t('walkin.stepService'),
    t('walkin.stepSummary'),
  ];

  return (
    <View style={styles.flex}>
      <WorkspaceHeader
        title={t('walkin.title')}
        onBack={step > 1 || navigation.canGoBack() ? handleBack : undefined}
      />
      <Screen scroll={false} padded={false}>
        <View
          style={[
            styles.stepperHeader,
            { backgroundColor: colors.surface, borderBottomColor: colors.border },
          ]}
        >
          <Stepper steps={stepLabels} currentStep={step - 1} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* STEP 1: BARBER SELECTION */}
          {step === 1 ? (
            <View style={styles.section}>
              <SectionHeader title={t('walkin.chooseAnyBarber')} />
              <OptionCard
                title={t('walkin.anyBarber')}
                subtitle={t('walkin.anyBarberDesc')}
                selected={selectedBarberId === null}
                onPress={() => {
                  setSelectedBarberId(null);
                  setStep(2);
                }}
                leftElement={
                  <View style={[styles.anyAvatar, { backgroundColor: colors.primaryLight }]}>
                    <Ionicons name="people" size={22} color={colors.primary} />
                  </View>
                }
                rightElement={
                  <Badge
                    label={t('floor.estimatedWaitShort', { minutes: generalWait })}
                    tone="primary"
                    size="sm"
                  />
                }
              />

              <SectionHeader
                title={t('walkin.chooseSpecificBarber')}
                style={{ marginTop: spacing.xs }}
              />

              {barbers.length === 0 ? (
                <EmptyState
                  compact
                  icon="cut-outline"
                  title={t('floor.noBarbersOnShift')}
                />
              ) : (
                barbers.map((b: BarberFloorState) => {
                  const selected = selectedBarberId === b.barber_id;
                  const isActive = b.shift_status === 'ACTIVE';
                  return (
                    <OptionCard
                      key={b.barber_id}
                      title={b.name || b.phone}
                      subtitle={t('walkin.estWait', {
                        time: `${b.wait_time_minutes} min`,
                      })}
                      selected={selected}
                      onPress={() => {
                        setSelectedBarberId(b.barber_id);
                        setStep(2);
                      }}
                      leftElement={
                        <Avatar
                          name={b.name || b.phone}
                          uri={b.avatar_url}
                          size="md"
                          status={isActive ? 'online' : 'offline'}
                        />
                      }
                      rightElement={
                        <StatusBadge
                          label={isActive ? t('walkin.availableToday') : t('shift.ended')}
                          tone={isActive ? 'success' : 'neutral'}
                          size="sm"
                        />
                      }
                    />
                  );
                })
              )}
            </View>
          ) : null}

          {/* STEP 2: SERVICE SELECTION */}
          {step === 2 ? (
            <View style={styles.section}>
              <Card variant="subtle" padding="md">
                <View style={styles.rowBetween}>
                  <View style={styles.rowCenter}>
                    <Avatar
                      name={
                        selectedBarberObj
                          ? selectedBarberObj.name || selectedBarberObj.phone
                          : 'A'
                      }
                      size="sm"
                    />
                    <View style={{ flex: 1 }}>
                      <AppText variant="bodyBold">
                        {selectedBarberObj
                          ? selectedBarberObj.name || selectedBarberObj.phone
                          : t('walkin.anyBarber')}
                      </AppText>
                      <AppText variant="caption">
                        {activeWorkspace?.business_name} • {activeWorkspace?.branch_name}
                      </AppText>
                    </View>
                  </View>
                  <Button
                    label={t('walkin.change')}
                    variant="secondary"
                    size="sm"
                    fullWidth={false}
                    onPress={() => setStep(1)}
                  />
                </View>
              </Card>

              <SectionHeader title={t('walkin.chooseServices')} />

              <View style={{ gap: spacing.sm }}>
                {activeServices.map((s: Service) => {
                  const selected = selectedServiceIds.includes(s.id);
                  return (
                    <ServiceItem
                      key={s.id}
                      name={s.name}
                      durationMinutes={s.duration_minutes}
                      durationLabel={t('service.durationMins', {
                        minutes: s.duration_minutes,
                      })}
                      price={s.price}
                      selected={selected}
                      onPress={() => toggleService(s.id)}
                    />
                  );
                })}
              </View>

              {error ? <AppText variant="error">{error}</AppText> : null}
            </View>
          ) : null}

          {/* STEP 3: WALK-IN DETAILS & SUMMARY */}
          {step === 3 ? (
            <View style={styles.section}>
              <SectionHeader title={t('walkin.bookingSummary')} />

              <Card variant="elevated" padding="lg">
                <View style={{ gap: spacing.sm }}>
                  {selectedServicesList.map((s) => (
                    <View key={s.id} style={styles.rowBetween}>
                      <View style={{ flex: 1 }}>
                        <AppText variant="bodyBold">{s.name}</AppText>
                        <AppText variant="caption">
                          {t('service.durationMins', { minutes: s.duration_minutes })}
                        </AppText>
                      </View>
                      <AppText variant="bodyBold">{formatCurrency(s.price)}</AppText>
                    </View>
                  ))}
                  <Divider spacingVertical="xs" />
                  <View style={styles.rowBetween}>
                    <AppText variant="heading3">{t('walkin.totalAmount')}</AppText>
                    <AppText variant="numeric" style={{ color: colors.primary }}>
                      {formatCurrency(totalFee)}
                    </AppText>
                  </View>
                </View>
              </Card>

              <SegmentedControl
                value={mode}
                onChange={(val) => {
                  setMode(val);
                  setError(null);
                }}
                options={[
                  { key: 'ANONYMOUS', label: t('walkin.modeAnon') },
                  { key: 'VERIFIED', label: t('walkin.modeVerified') },
                ]}
              />

              <Input
                label={t('walkin.customerName')}
                placeholder="e.g. Nimal"
                value={customerName}
                onChangeText={setCustomerName}
                leftIcon="person-outline"
              />

              {mode === 'VERIFIED' ? (
                <Input
                  label={t('walkin.customerPhone')}
                  placeholder="0771234567"
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={(txt) => {
                    setPhone(txt);
                    setError(null);
                  }}
                  leftIcon="call-outline"
                />
              ) : null}

              <Card
                variant="outlined"
                padding="md"
                style={{
                  backgroundColor: colors.warningLight,
                  borderColor: colors.warning,
                }}
              >
                <View style={styles.rowCenter}>
                  <Ionicons name="information-circle" size={20} color={colors.warning} />
                  <View style={{ flex: 1 }}>
                    <AppText variant="bodyBold">{t('walkin.importantNote')}</AppText>
                    <AppText variant="caption" style={{ color: colors.textSecondary }}>
                      {t('walkin.importantNoteDesc')}
                    </AppText>
                  </View>
                </View>
              </Card>

              {error ? <AppText variant="error">{error}</AppText> : null}

              <Button
                label={t('walkin.confirmBooking')}
                size="lg"
                leftIcon="checkmark-circle"
                onPress={() => walkInMutation.mutate()}
                loading={walkInMutation.isPending}
              />
            </View>
          ) : null}
        </ScrollView>

        {/* Step 2 Sticky Summary Footer */}
        {step === 2 ? (
          <View
            style={[
              styles.stickyFooter,
              getShadow(colors, 'lg'),
              { backgroundColor: colors.surface, borderTopColor: colors.border },
            ]}
          >
            <View style={styles.rowBetween}>
              <View>
                <AppText variant="caption">
                  {t('booking.servicesSelected', { count: selectedServiceIds.length })} •{' '}
                  {t('service.durationMins', { minutes: totalDuration })}
                </AppText>
                <AppText variant="numeric" style={{ color: colors.primary }}>
                  {formatCurrency(totalFee)}
                </AppText>
              </View>
              <Button
                label={t('walkin.next')}
                fullWidth={false}
                disabled={selectedServiceIds.length === 0}
                onPress={() => {
                  setError(null);
                  setStep(3);
                }}
              />
            </View>
          </View>
        ) : null}
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  stepperHeader: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: 120,
    gap: spacing.lg,
  },
  section: {
    gap: spacing.md,
  },
  anyAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
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
  stickyFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
  },
});
