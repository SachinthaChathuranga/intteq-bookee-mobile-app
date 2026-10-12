import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { fetchServices } from '../../api/owner';
import { addWalkIn, fetchBranchLiveFloor, fetchWaitTimes } from '../../api/receptionist';
import { AppText } from '../../components/AppText';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Screen } from '../../components/Screen';
import { TextField } from '../../components/TextField';
import { useT } from '../../i18n';
import { WorkspaceHeader } from '../../navigation/workspaces/WorkspaceHeader';
import { useTheme } from '../../theme/ThemeProvider';
import { formatCurrency } from '../../utils/format';
import { WalkInSuccessModal } from './WalkInSuccessModal';

interface Props {
  route: {
    params: {
      branchId: string;
      preselectedBarberId?: string;
    };
  };
  navigation: {
    goBack: () => void;
  };
}

export function AddWalkInScreen({ route, navigation }: Props) {
  const { branchId, preselectedBarberId } = route.params;
  const t = useT();
  const { colors } = useTheme();
  const queryClient = useQueryClient();

  const [mode, setMode] = useState<'ANONYMOUS' | 'VERIFIED'>('ANONYMOUS');
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [selectedBarberId, setSelectedBarberId] = useState<string | null>(
    preselectedBarberId ?? null,
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{
    token: string;
    name?: string | null;
    wait: number;
  } | null>(null);

  const servicesQuery = useQuery({
    queryKey: ['services', branchId],
    queryFn: () => fetchServices(branchId),
  });

  const liveFloorQuery = useQuery({
    queryKey: ['live-floor', branchId],
    queryFn: () => fetchBranchLiveFloor(branchId),
  });

  const waitTimesQuery = useQuery({
    queryKey: ['wait-times', branchId],
    queryFn: () => fetchWaitTimes(branchId),
    refetchInterval: 15000,
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
    setSelectedServiceIds((prev) =>
      prev.includes(serviceId)
        ? prev.filter((id) => id !== serviceId)
        : [...prev, serviceId],
    );
    setFormError(null);
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

  const currentEstWait = selectedBarberId
    ? waitTimesQuery.data?.barber_wait_times[selectedBarberId] ?? 0
    : waitTimesQuery.data?.general_wait_minutes ?? 0;

  const onShiftBarbers = liveFloorQuery.data?.barbers.filter(
    (b) => b.shift_status === 'ACTIVE' || b.shift_status === 'PAUSED',
  ) ?? [];

  return (
    <View style={{ flex: 1 }}>
      <WorkspaceHeader title={t('walkin.title')} onBack={navigation.goBack} />
      <Screen>
        <ScrollView contentContainerStyle={styles.scroll}>
          {/* Mode Switcher */}
          <View style={[styles.modeContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <TouchableOpacity
              onPress={() => {
                setMode('ANONYMOUS');
                setFormError(null);
              }}
              style={[
                styles.modeTab,
                {
                  backgroundColor: mode === 'ANONYMOUS' ? colors.primary : colors.surface,
                },
              ]}
            >
              <AppText
                style={{
                  color: mode === 'ANONYMOUS' ? colors.onPrimary : colors.text,
                  fontWeight: '600',
                }}
              >
                {t('walkin.modeAnon')}
              </AppText>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setMode('VERIFIED');
                setFormError(null);
              }}
              style={[
                styles.modeTab,
                {
                  backgroundColor: mode === 'VERIFIED' ? colors.primary : colors.surface,
                },
              ]}
            >
              <AppText
                style={{
                  color: mode === 'VERIFIED' ? colors.onPrimary : colors.text,
                  fontWeight: '600',
                }}
              >
                {t('walkin.modeVerified')}
              </AppText>
            </TouchableOpacity>
          </View>

          {/* Customer Details */}
          <Card>
            <TextField
              label={t('walkin.customerName')}
              value={customerName}
              onChangeText={setCustomerName}
              placeholder="e.g. Kasun"
            />

            {mode === 'VERIFIED' ? (
              <TextField
                label={t('walkin.customerPhone')}
                value={phone}
                onChangeText={setPhone}
                placeholder="07X XXX XXXX"
                keyboardType="phone-pad"
              />
            ) : null}
          </Card>

          {/* Service Multi-Select */}
          <Card>
            <AppText variant="body" style={{ fontWeight: '700', marginBottom: 8 }}>
              {t('walkin.selectServices')}
            </AppText>
            <View style={styles.servicesGrid}>
              {(servicesQuery.data ?? []).map((service) => {
                const isSelected = selectedServiceIds.includes(service.id);
                return (
                  <TouchableOpacity
                    key={service.id}
                    onPress={() => toggleService(service.id)}
                    style={[
                      styles.serviceOption,
                      {
                        backgroundColor: isSelected ? colors.primary : colors.surface,
                        borderColor: isSelected ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <AppText
                      style={{
                        color: isSelected ? colors.onPrimary : colors.text,
                        fontWeight: '600',
                      }}
                    >
                      {service.name}
                    </AppText>
                    <AppText
                      variant="caption"
                      style={{
                        color: isSelected ? colors.onPrimary : colors.textMuted,
                      }}
                    >
                      {formatCurrency(service.price)} • {service.duration_minutes}m
                    </AppText>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Card>

          {/* Barber Selection */}
          <Card>
            <AppText variant="body" style={{ fontWeight: '700', marginBottom: 8 }}>
              {t('walkin.selectBarber')}
            </AppText>

            {/* Any Barber / General Queue Option */}
            <TouchableOpacity
              onPress={() => setSelectedBarberId(null)}
              style={[
                styles.barberOption,
                {
                  backgroundColor: selectedBarberId === null ? colors.primary : colors.surface,
                  borderColor: selectedBarberId === null ? colors.primary : colors.border,
                },
              ]}
            >
              <View style={{ flex: 1 }}>
                <AppText
                  style={{
                    color: selectedBarberId === null ? colors.onPrimary : colors.text,
                    fontWeight: '700',
                  }}
                >
                  {t('walkin.anyBarber')}
                </AppText>
                <AppText
                  variant="caption"
                  style={{
                    color: selectedBarberId === null ? colors.onPrimary : colors.textMuted,
                  }}
                >
                  {t('walkin.anyBarberDesc')}
                </AppText>
              </View>
              <Badge
                label={`${waitTimesQuery.data?.general_wait_minutes ?? 0}m`}
                variant="primary"
              />
            </TouchableOpacity>

            {/* On-shift barbers */}
            {onShiftBarbers.map((barber) => {
              const isSelected = selectedBarberId === barber.barber_id;
              const waitMins = waitTimesQuery.data?.barber_wait_times[barber.barber_id] ?? 0;
              return (
                <TouchableOpacity
                  key={barber.barber_id}
                  onPress={() => setSelectedBarberId(barber.barber_id)}
                  style={[
                    styles.barberOption,
                    {
                      backgroundColor: isSelected ? colors.primary : colors.surface,
                      borderColor: isSelected ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <AppText
                      style={{
                        color: isSelected ? colors.onPrimary : colors.text,
                        fontWeight: '600',
                      }}
                    >
                      {barber.name || barber.phone}
                    </AppText>
                    <AppText
                      variant="caption"
                      style={{
                        color: isSelected ? colors.onPrimary : colors.textMuted,
                      }}
                    >
                      {barber.waiting.length} waiting
                    </AppText>
                  </View>
                  <Badge
                    label={`${waitMins}m`}
                    variant="warning"
                  />
                </TouchableOpacity>
              );
            })}
          </Card>

          {/* Est Wait Preview Card */}
          <Card>
            <View style={styles.waitRow}>
              <AppText variant="body" style={{ fontWeight: '600' }}>
                {t('walkin.estWait', { time: `${currentEstWait} mins` })}
              </AppText>
            </View>
          </Card>

          {formError ? <AppText variant="error">{formError}</AppText> : null}

          <Button
            label={t('walkin.submit')}
            onPress={handleSubmit}
            loading={addWalkInMutation.isPending}
          />
        </ScrollView>
      </Screen>

      {/* Success Modal */}
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
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: 40,
    gap: 16,
  },
  modeContainer: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    padding: 4,
  },
  modeTab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  serviceOption: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    minWidth: '45%',
    flexGrow: 1,
  },
  barberOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 8,
  },
  waitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
});
