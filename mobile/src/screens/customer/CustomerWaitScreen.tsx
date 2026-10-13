import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, StyleSheet, TouchableOpacity, View } from 'react-native';
import { fetchCustomerActiveQueue, leaveCustomerQueue } from '../../api/customer';
import { useQueueSocket } from '../../api/socket';
import { AppText } from '../../components/AppText';
import { useT } from '../../i18n';
import type { CustomerStackParamList } from '../../navigation/types';
import { useTheme } from '../../theme/ThemeProvider';
import {
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  Screen,
  Skeleton,
  haptics,
  radius,
  spacing,
} from '../../ui';
import { formatCurrency } from '../../utils/format';

type Props = NativeStackScreenProps<CustomerStackParamList, 'CustomerWait'>;

export function CustomerWaitScreen({ navigation }: Props) {
  const t = useT();
  const { colors } = useTheme();
  const queryClient = useQueryClient();

  const activeQueueQuery = useQuery({
    queryKey: ['customer-active-queue'],
    queryFn: fetchCustomerActiveQueue,
    refetchInterval: 5000,
  });

  const activeQueue = activeQueueQuery.data;

  // Real-time WebSocket subscription for this branch
  useQueueSocket(activeQueue?.branch_id);

  const leaveMutation = useMutation({
    mutationFn: leaveCustomerQueue,
    onSuccess: () => {
      haptics.light();
      queryClient.invalidateQueries({ queryKey: ['customer-active-queue'] });
      navigation.goBack();
    },
    onError: () => {
      Alert.alert('Error', t('common.error.generic'));
    },
  });

  const handleLeaveQueue = () => {
    haptics.medium();
    Alert.alert(
      t('waitScreen.leaveQueueConfirmTitle'),
      t('waitScreen.leaveQueueConfirmDesc'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('waitScreen.leaveQueueConfirmAction'),
          style: 'destructive',
          onPress: () => leaveMutation.mutate(),
        },
      ],
    );
  };

  if (activeQueueQuery.isLoading) {
    return (
      <Screen contentContainerStyle={styles.container}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </TouchableOpacity>
          <AppText variant="title" style={{ fontSize: 20 }}>
            {t('waitScreen.title')}
          </AppText>
          <View style={{ width: 40 }} />
        </View>
        <View style={{ gap: spacing.md, marginTop: spacing.md }}>
          <Skeleton width="100%" height={160} borderRadius={radius.card} />
          <Skeleton width="100%" height={100} borderRadius={radius.card} />
          <Skeleton width="100%" height={140} borderRadius={radius.card} />
        </View>
      </Screen>
    );
  }

  if (!activeQueue) {
    return (
      <Screen contentContainerStyle={styles.container}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </TouchableOpacity>
          <AppText variant="title" style={{ fontSize: 20 }}>
            {t('waitScreen.title')}
          </AppText>
          <View style={{ width: 40 }} />
        </View>
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <EmptyState
            icon={<Ionicons name="hourglass-outline" size={44} color={colors.textMuted} />}
            title={t('waitScreen.notInQueueTitle')}
            description={t('waitScreen.notInQueueDesc')}
            actionLabel={t('waitScreen.backToHome')}
            onAction={() => navigation.goBack()}
          />
        </View>
      </Screen>
    );
  }

  const statusVariant =
    activeQueue.status === 'CALLED'
      ? 'warning'
      : activeQueue.status === 'IN_SERVICE'
      ? 'success'
      : 'primary';

  const statusLabel =
    activeQueue.status === 'CALLED'
      ? t('waitScreen.statusCalled')
      : activeQueue.status === 'IN_SERVICE'
      ? t('waitScreen.statusInService')
      : t('waitScreen.statusWaiting');

  const aheadLabel =
    activeQueue.people_ahead === 0
      ? t('waitScreen.youAreNext')
      : t('waitScreen.peopleAhead', { count: activeQueue.people_ahead });

  return (
    <Screen
      scrollable
      refreshing={activeQueueQuery.isRefetching}
      onRefresh={() => activeQueueQuery.refetch()}
      contentContainerStyle={styles.container}
    >
      {/* Top Header */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <AppText variant="title" style={{ fontSize: 20 }}>
          {t('waitScreen.title')}
        </AppText>
        <View style={{ width: 40 }} />
      </View>

      {/* Main Token & Status Hero Card */}
      <Card style={[styles.heroCard, { borderColor: colors.primaryBorder }]}>
        <View style={styles.heroHeader}>
          <Badge label={statusLabel} variant={statusVariant} />
          <Badge
            label={t('waitScreen.position', { position: activeQueue.position })}
            variant="neutral"
          />
        </View>

        <View style={styles.tokenSection}>
          <AppText variant="caption" style={{ color: colors.textMuted }}>
            {t('booking.yourToken')}
          </AppText>
          <AppText variant="title" style={[styles.tokenText, { color: colors.primary }]}>
            {activeQueue.token_number}
          </AppText>
        </View>

        <View style={[styles.metricsRow, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <View style={styles.metricItem}>
            <Ionicons name="people-sharp" size={18} color={colors.primary} />
            <AppText variant="bodyBold" style={{ fontSize: 14 }}>
              {aheadLabel}
            </AppText>
          </View>
          <View style={[styles.metricDivider, { backgroundColor: colors.border }]} />
          <View style={styles.metricItem}>
            <Ionicons name="time-outline" size={18} color={colors.primary} />
            <AppText variant="bodyBold" style={{ fontSize: 14 }}>
              {t('waitScreen.estimatedWait', { minutes: activeQueue.estimated_wait_minutes })}
            </AppText>
          </View>
        </View>
      </Card>

      {/* Barber Card */}
      <Card style={styles.sectionCard}>
        <AppText variant="caption" style={{ color: colors.textMuted }}>
          {t('waitScreen.barber')}
        </AppText>
        <View style={styles.barberRow}>
          {activeQueue.barber_name ? (
            <>
              <Avatar name={activeQueue.barber_name} shape="square" size="md" />
              <View style={{ flex: 1 }}>
                <AppText variant="bodyBold" style={{ fontSize: 16 }}>
                  {activeQueue.barber_name}
                </AppText>
              </View>
            </>
          ) : (
            <>
              <View style={[styles.anyBarberIcon, { backgroundColor: colors.primaryLight }]}>
                <Ionicons name="shuffle" size={22} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <AppText variant="bodyBold" style={{ fontSize: 16 }}>
                  {t('waitScreen.anyBarber')}
                </AppText>
                <AppText variant="caption" style={{ color: colors.textMuted }}>
                  {t('waitScreen.anyBarberSub')}
                </AppText>
              </View>
            </>
          )}
        </View>
      </Card>

      {/* Branch & Salon Card */}
      <Card style={styles.sectionCard}>
        <View style={{ gap: 4 }}>
          <AppText variant="heading" style={{ fontSize: 16 }}>
            {activeQueue.business_name}
          </AppText>
          <View style={styles.branchAddressRow}>
            <Ionicons name="location-outline" size={15} color={colors.primary} />
            <AppText variant="body" style={{ color: colors.text, fontSize: 13, flex: 1 }}>
              {activeQueue.branch_name} • {activeQueue.branch_address}
            </AppText>
          </View>
        </View>
      </Card>

      {/* Services Breakdown Card */}
      {activeQueue.services.length > 0 && (
        <Card style={styles.sectionCard}>
          <AppText variant="caption" style={{ color: colors.textMuted }}>
            {t('waitScreen.selectedServices')}
          </AppText>
          <View style={{ gap: spacing.xs, marginTop: 4 }}>
            {activeQueue.services.map((svc) => (
              <View key={svc.id} style={styles.serviceItem}>
                <AppText variant="body" style={{ flex: 1 }}>
                  {svc.name}
                </AppText>
                <AppText variant="caption" style={{ color: colors.textMuted, marginRight: 8 }}>
                  {svc.duration_minutes} mins
                </AppText>
                <AppText variant="bodyBold">
                  {formatCurrency(svc.price)}
                </AppText>
              </View>
            ))}
            <View style={[styles.totalRow, { borderTopColor: colors.border }]}>
              <AppText variant="bodyBold">{t('waitScreen.total')}</AppText>
              <AppText variant="heading" style={{ color: colors.primary, fontSize: 16 }}>
                {formatCurrency(activeQueue.total_price)}
              </AppText>
            </View>
          </View>
        </Card>
      )}

      {/* Leave Queue Button */}
      {activeQueue.status === 'WAITING' && (
        <View style={styles.leaveSection}>
          <Button
            variant="danger"
            label={t('waitScreen.leaveQueue')}
            onPress={handleLeaveQueue}
            loading={leaveMutation.isPending}
            icon={<Ionicons name="exit-outline" size={18} color={colors.surface} />}
          />
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
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  heroCard: {
    padding: spacing.lg,
    gap: spacing.md,
    alignItems: 'center',
    borderWidth: 1.5,
  },
  heroHeader: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tokenSection: {
    alignItems: 'center',
    gap: 4,
    marginVertical: spacing.sm,
  },
  tokenText: {
    fontSize: 44,
    fontWeight: '800',
    letterSpacing: 2,
  },
  metricsRow: {
    width: '100%',
    flexDirection: 'row',
    borderRadius: radius.card,
    borderWidth: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  metricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metricDivider: {
    width: 1,
    height: 24,
  },
  sectionCard: {
    padding: spacing.md,
    gap: spacing.xs,
  },
  barberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: 4,
  },
  anyBarberIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  branchAddressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  serviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: spacing.sm,
    marginTop: 4,
  },
  leaveSection: {
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
  },
});
