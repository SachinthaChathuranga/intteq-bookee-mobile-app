import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  fetchBranchAvailability,
  fetchBranchBarbers,
  fetchBranchServices,
  type BranchBarber,
  type BranchService,
} from '../../api/customer';
import { AppText } from '../../components/AppText';
import { useT } from '../../i18n';
import type { ReceptionistStackParamList } from '../../navigation/types';
import { WorkspaceHeader } from '../../navigation/workspaces/WorkspaceHeader';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { useTheme } from '../../theme/ThemeProvider';
import {
  Avatar,
  Badge,
  Card,
  EmptyState,
  Screen,
  Skeleton,
  radius,
  spacing,
} from '../../ui';
import { haptics } from '../../ui/haptics';
import { formatCurrency } from '../../utils/format';

type Props = NativeStackScreenProps<ReceptionistStackParamList, 'AvailabilityLookup'>;

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

export function ReceptionistAvailabilityScreen({ navigation }: Props) {
  const t = useT();
  const { colors } = useTheme();

  const activeWorkspace = useWorkspaceStore((s) => s.activeWorkspace);
  const activeBranchId = useWorkspaceStore((s) => s.activeBranchId) ?? activeWorkspace?.branch_id;

  const sevenDays = useMemo(() => getNext7DaysColombo(), []);
  const [selectedDate, setSelectedDate] = useState<string>(sevenDays[0]?.dateStr ?? '');
  const [selectedBarberId, setSelectedBarberId] = useState<string | null>(null);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);

  // Branch Barbers
  const barbersQuery = useQuery({
    queryKey: ['branch-barbers', activeBranchId],
    queryFn: () => fetchBranchBarbers(activeBranchId!),
    enabled: Boolean(activeBranchId),
  });

  const barbers = barbersQuery.data?.barbers ?? [];

  // Branch Services
  const servicesQuery = useQuery({
    queryKey: ['branch-services', activeBranchId],
    queryFn: () => fetchBranchServices(activeBranchId!),
    enabled: Boolean(activeBranchId),
  });

  const services = servicesQuery.data?.services ?? [];

  // Toggle Service
  const toggleService = (serviceId: string) => {
    haptics.selection();
    setSelectedServiceIds((prev) =>
      prev.includes(serviceId) ? prev.filter((id) => id !== serviceId) : [...prev, serviceId],
    );
  };

  const selectedServices = useMemo(() => {
    return services.filter((s) => selectedServiceIds.includes(s.id));
  }, [services, selectedServiceIds]);

  const totalDuration = useMemo(() => {
    return selectedServices.reduce((sum, s) => sum + s.duration_minutes, 0);
  }, [selectedServices]);

  const totalPrice = useMemo(() => {
    return selectedServices.reduce((sum, s) => sum + s.price, 0);
  }, [selectedServices]);

  // Availability Query
  const availabilityQuery = useQuery({
    queryKey: [
      'branch-availability',
      activeBranchId,
      selectedDate,
      selectedServiceIds,
      selectedBarberId,
    ],
    queryFn: () =>
      fetchBranchAvailability(
        activeBranchId!,
        selectedDate,
        selectedServiceIds,
        selectedBarberId || undefined,
      ),
    enabled: Boolean(activeBranchId) && Boolean(selectedDate) && selectedServiceIds.length > 0,
  });

  const availability = availabilityQuery.data;

  return (
    <View style={{ flex: 1 }}>
      <WorkspaceHeader title={t('receptionist.availabilityTitle')} />

      <Screen
        scrollable
        refreshing={availabilityQuery.isRefetching}
        onRefresh={() => availabilityQuery.refetch()}
        contentContainerStyle={styles.container}
      >
        {/* 1. Date Strip */}
        <View style={styles.section}>
          <AppText variant="bodyBold" style={{ fontSize: 16 }}>
            {t('appointments.selectDate')}
          </AppText>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsRow}
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
        </View>

        {/* 2. Barber Selector Strip */}
        <View style={styles.section}>
          <AppText variant="bodyBold" style={{ fontSize: 16 }}>
            {t('booking.stepBarber')}
          </AppText>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsRow}
          >
            {/* Any Barber Chip */}
            <Pressable
              onPress={() => {
                haptics.selection();
                setSelectedBarberId(null);
              }}
              style={[
                styles.barberChip,
                {
                  backgroundColor: selectedBarberId === null ? colors.primary : colors.surface,
                  borderColor: selectedBarberId === null ? colors.primary : colors.border,
                },
              ]}
            >
              <Ionicons
                name="people"
                size={16}
                color={selectedBarberId === null ? colors.onPrimary : colors.primary}
              />
              <AppText
                variant="caption"
                style={{
                  color: selectedBarberId === null ? colors.onPrimary : colors.text,
                  fontWeight: '700',
                }}
              >
                {t('receptionist.allBarbers')}
              </AppText>
            </Pressable>

            {barbers.map((b) => {
              const isSelected = selectedBarberId === b.id;
              return (
                <Pressable
                  key={b.id}
                  onPress={() => {
                    haptics.selection();
                    setSelectedBarberId(b.id);
                  }}
                  style={[
                    styles.barberChip,
                    {
                      backgroundColor: isSelected ? colors.primary : colors.surface,
                      borderColor: isSelected ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Avatar name={b.name || 'Barber'} size="sm" />
                  <AppText
                    variant="caption"
                    style={{
                      color: isSelected ? colors.onPrimary : colors.text,
                      fontWeight: '700',
                    }}
                  >
                    {b.name}
                  </AppText>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* 3. Services Selector */}
        <View style={styles.section}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <AppText variant="bodyBold" style={{ fontSize: 16 }}>
              {t('receptionist.selectServices')}
            </AppText>
            {selectedServices.length > 0 && (
              <Badge
                label={`${selectedServices.length} • ${totalDuration}m • ${formatCurrency(totalPrice)}`}
                variant="primary"
              />
            )}
          </View>

          {servicesQuery.isLoading ? (
            <View style={{ gap: spacing.sm }}>
              <Skeleton width="100%" height={56} borderRadius={radius.card} />
              <Skeleton width="100%" height={56} borderRadius={radius.card} />
            </View>
          ) : (
            <View style={{ gap: spacing.sm }}>
              {services.map((svc) => {
                const isSelected = selectedServiceIds.includes(svc.id);
                return (
                  <Pressable
                    key={svc.id}
                    onPress={() => toggleService(svc.id)}
                    style={[
                      styles.serviceItem,
                      {
                        backgroundColor: isSelected ? colors.primaryLight : colors.surface,
                        borderColor: isSelected ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <View style={{ flex: 1, gap: 2 }}>
                      <AppText variant="bodyBold" style={{ fontSize: 15 }}>
                        {svc.name}
                      </AppText>
                      <AppText variant="caption" style={{ color: colors.textMuted }}>
                        {svc.duration_minutes} mins • {formatCurrency(svc.price)}
                      </AppText>
                    </View>

                    <View
                      style={[
                        styles.checkbox,
                        {
                          backgroundColor: isSelected ? colors.primary : colors.surface,
                          borderColor: isSelected ? colors.primary : colors.border,
                        },
                      ]}
                    >
                      {isSelected ? (
                        <Ionicons name="checkmark" size={14} color={colors.onPrimary} />
                      ) : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>

        {/* 4. Available Slots Section */}
        <View style={styles.section}>
          <AppText variant="bodyBold" style={{ fontSize: 16 }}>
            {t('receptionist.availableSlots')}
          </AppText>

          {selectedServiceIds.length === 0 ? (
            <Card style={{ padding: spacing.lg, alignItems: 'center' }}>
              <Ionicons name="cut-outline" size={32} color={colors.textMuted} />
              <AppText variant="caption" style={{ color: colors.textMuted, textAlign: 'center', marginTop: 8 }}>
                {t('receptionist.selectServicesHint')}
              </AppText>
            </Card>
          ) : availabilityQuery.isLoading ? (
            <View style={styles.slotsGrid}>
              {Array.from({ length: 9 }).map((_, i) => (
                <Skeleton key={i} width="30%" height={46} borderRadius={radius.input} />
              ))}
            </View>
          ) : availability?.is_closed ? (
            <EmptyState
              icon={<Ionicons name="calendar-outline" size={36} color={colors.textMuted} />}
              title={t('booking.closed')}
              description={t('booking.noSlots')}
            />
          ) : !availability?.slots || availability.slots.length === 0 ? (
            <EmptyState
              icon={<Ionicons name="time-outline" size={36} color={colors.textMuted} />}
              title={t('booking.noSlots')}
              description={t('receptionist.noSlotsFound')}
            />
          ) : (
            <View style={styles.slotsGrid}>
              {availability.slots.map((slot) => {
                const isAvailable = slot.available;
                return (
                  <View
                    key={slot.time}
                    style={[
                      styles.slotItem,
                      {
                        backgroundColor: isAvailable ? colors.surface : colors.background,
                        borderColor: isAvailable ? colors.primary : colors.border,
                        opacity: isAvailable ? 1 : 0.4,
                      },
                    ]}
                  >
                    <AppText
                      variant="bodyBold"
                      style={{
                        color: isAvailable ? colors.text : colors.textMuted,
                        fontSize: 14,
                      }}
                    >
                      {slot.time}
                    </AppText>
                    <Badge
                      label={isAvailable ? 'FREE' : 'BUSY'}
                      variant={isAvailable ? 'success' : 'neutral'}
                    />
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    gap: spacing.lg,
    paddingBottom: 40,
  },
  section: {
    gap: spacing.sm,
  },
  chipsRow: {
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
  barberChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.card,
    borderWidth: 1,
  },
  serviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.card,
    borderWidth: 1,
    gap: spacing.md,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
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
    gap: 4,
  },
});
