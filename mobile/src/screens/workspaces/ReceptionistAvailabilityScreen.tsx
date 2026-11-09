import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { fetchServices } from '../../api/owner';
import {
  fetchBranchAvailability,
  fetchBranchBarbers,
  type BranchBarber,
  type SlotAvailability,
} from '../../api/customer';
import { AppText } from '../../components/AppText';
import { useT } from '../../i18n';
import { WorkspaceHeader } from '../../navigation/workspaces/WorkspaceHeader';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { useTheme } from '../../theme/ThemeProvider';
import {
  Badge,
  Chip,
  EmptyState,
  Screen,
  SectionHeader,
  ServiceItem,
  SkeletonCard,
  haptics,
  radius,
  spacing,
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

export function ReceptionistAvailabilityScreen() {
  const t = useT();
  const { colors } = useTheme();
  const activeWorkspace = useWorkspaceStore((s) => s.activeWorkspace);
  const branchId = activeWorkspace?.branch_id;

  const days = useMemo(() => getNext7Days(), []);
  const [selectedDate, setSelectedDate] = useState<string>(days[0].dateStr);
  const [selectedBarberId, setSelectedBarberId] = useState<string | null>(null);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);

  const servicesQuery = useQuery({
    queryKey: ['services', branchId],
    queryFn: () => fetchServices(branchId!),
    enabled: Boolean(branchId),
  });

  const barbersQuery = useQuery({
    queryKey: ['salon-branch-barbers', branchId],
    queryFn: () => fetchBranchBarbers(branchId!),
    enabled: Boolean(branchId),
  });

  const availabilityQuery = useQuery({
    queryKey: [
      'receptionist-availability',
      branchId,
      selectedDate,
      selectedServiceIds.join(','),
      selectedBarberId ?? 'ANY',
    ],
    queryFn: () =>
      fetchBranchAvailability(
        branchId!,
        selectedDate,
        selectedServiceIds,
        selectedBarberId,
      ),
    enabled: Boolean(branchId && selectedServiceIds.length > 0),
  });

  const toggleService = (id: string) => {
    setSelectedServiceIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const services = (servicesQuery.data ?? []).filter((s) => s.is_active);
  const barbers = barbersQuery.data?.barbers ?? [];
  const avail = availabilityQuery.data;

  return (
    <View style={styles.flex}>
      <WorkspaceHeader title={t('receptionist.availabilityTitle')} />
      <Screen scroll={false} padded={false}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* 1. Select Services */}
          <View style={styles.section}>
            <SectionHeader
              title={t('receptionist.selectServices')}
              subtitle={t('receptionist.selectServicesHint')}
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
            <View style={{ gap: spacing.sm }}>
              {services.map((s) => {
                const isSelected = selectedServiceIds.includes(s.id);
                return (
                  <ServiceItem
                    key={s.id}
                    name={s.name}
                    durationMinutes={s.duration_minutes}
                    durationLabel={t('service.durationMins', { minutes: s.duration_minutes })}
                    price={s.price}
                    selected={isSelected}
                    onPress={() => toggleService(s.id)}
                  />
                );
              })}
            </View>
          </View>

          {/* 2. Select Date */}
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
          </View>

          {/* 3. Select Barber Filter */}
          <View style={styles.section}>
            <SectionHeader title={t('booking.barber')} />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.barberScroll}
            >
              <Chip
                label={t('receptionist.allBarbers')}
                selected={selectedBarberId === null}
                leftIcon="people-outline"
                onPress={() => setSelectedBarberId(null)}
              />
              {barbers.map((b: BranchBarber) => (
                <Chip
                  key={b.id}
                  label={b.name || t('term.barber')}
                  selected={selectedBarberId === b.id}
                  leftIcon="cut-outline"
                  onPress={() => setSelectedBarberId(b.id)}
                />
              ))}
            </ScrollView>
          </View>

          {/* 4. Available Slots Result */}
          <View style={styles.section}>
            <SectionHeader title={t('receptionist.availableSlots')} />

            {selectedServiceIds.length === 0 ? (
              <EmptyState
                compact
                icon="options-outline"
                title={t('receptionist.selectServicesHint')}
              />
            ) : availabilityQuery.isLoading ? (
              <SkeletonCard />
            ) : avail?.is_closed ? (
              <EmptyState compact icon="lock-closed-outline" title={t('booking.closed')} />
            ) : !avail?.slots || avail.slots.filter((s) => s.available).length === 0 ? (
              <EmptyState compact icon="calendar-outline" title={t('receptionist.noSlotsFound')} />
            ) : (
              <View style={styles.slotsGrid}>
                {avail.slots
                  .filter((s: SlotAvailability) => s.available)
                  .map((slot: SlotAvailability) => (
                    <View
                      key={slot.start_at}
                      style={[
                        styles.slotBadge,
                        { backgroundColor: colors.surface, borderColor: colors.border },
                      ]}
                    >
                      <AppText variant="bodyBold" style={{ color: colors.primary }}>
                        {slot.time}
                      </AppText>
                    </View>
                  ))}
              </View>
            )}
          </View>
        </ScrollView>
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    gap: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  section: {
    gap: spacing.sm + 2,
  },
  dateScroll: {
    gap: spacing.sm,
    paddingVertical: 2,
  },
  dateChip: {
    width: 64,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    gap: 2,
  },
  barberScroll: {
    gap: spacing.sm,
    paddingVertical: 2,
  },
  slotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  slotBadge: {
    width: '31%',
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
  },
});
