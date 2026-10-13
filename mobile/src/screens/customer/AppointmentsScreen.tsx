import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { StyleSheet, View } from 'react-native';
import { fetchCustomerAppointments } from '../../api/customer';
import { AppText } from '../../components/AppText';
import { useT } from '../../i18n';
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
import { formatCurrency } from '../../utils/format';

export function AppointmentsScreen() {
  const t = useT();
  const { colors } = useTheme();

  const appointmentsQuery = useQuery({
    queryKey: ['customer-appointments'],
    queryFn: () => fetchCustomerAppointments(),
  });

  const appointments = appointmentsQuery.data?.appointments ?? [];

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
          <Skeleton width="100%" height={120} borderRadius={radius.card} />
          <Skeleton width="100%" height={120} borderRadius={radius.card} />
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
                      apt.status === 'CONFIRMED'
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
              </Card>
            );
          })}
        </View>
      )}
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
});
