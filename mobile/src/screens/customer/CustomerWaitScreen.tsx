import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { Animated, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
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
  ConfirmationDialog,
  Divider,
  EmptyState,
  Screen,
  ScreenHeader,
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

type Props = NativeStackScreenProps<CustomerStackParamList, 'CustomerWait'>;

export function CustomerWaitScreen({ navigation }: Props) {
  const t = useT();
  const { colors } = useTheme();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [confirmLeaveOpen, setConfirmLeaveOpen] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const activeQueueQuery = useQuery({
    queryKey: ['customer-active-queue'],
    queryFn: fetchCustomerActiveQueue,
  });

  const activeQueue = activeQueueQuery.data;

  useQueueSocket(activeQueue?.branch_id);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.04,
          duration: 1100,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1100,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim]);

  const leaveMutation = useMutation({
    mutationFn: leaveCustomerQueue,
    onSuccess: () => {
      haptics.medium();
      setConfirmLeaveOpen(false);
      queryClient.setQueryData(['customer-active-queue'], null);
      queryClient.invalidateQueries({ queryKey: ['customer-active-queue'] });
      navigation.navigate('CustomerTabs', { screen: 'HomeTab' });
    },
    onError: (err: any) => {
      setConfirmLeaveOpen(false);
      showToast({ title: err?.message || t('common.error.generic'), tone: 'error' });
    },
  });

  if (activeQueueQuery.isLoading) {
    return (
      <Screen>
        <ScreenHeader title={t('waitScreen.title')} onBack={() => navigation.goBack()} />
        <View style={{ gap: spacing.md, marginTop: spacing.md }}>
          <SkeletonCard />
          <SkeletonCard />
        </View>
      </Screen>
    );
  }

  if (!activeQueue) {
    return (
      <Screen>
        <ScreenHeader title={t('waitScreen.title')} onBack={() => navigation.goBack()} />
        <View style={styles.emptyWrap}>
          <EmptyState
            icon="time-outline"
            title={t('waitScreen.notInQueueTitle')}
            description={t('waitScreen.notInQueueDesc')}
            actionLabel={t('waitScreen.backToHome')}
            onActionPress={() => navigation.navigate('CustomerTabs', { screen: 'HomeTab' })}
          />
        </View>
      </Screen>
    );
  }

  const isCalled = activeQueue.status === 'CALLED';
  const isInService = activeQueue.status === 'IN_SERVICE';

  const statusLabel = isCalled
    ? t('waitScreen.statusCalled')
    : isInService
      ? t('waitScreen.statusInService')
      : t('waitScreen.statusWaiting');

  const statusTone = isCalled ? 'warning' : isInService ? 'success' : 'primary';

  const progressSteps = [
    t('waitScreen.statusWaiting'),
    t('waitScreen.statusCalled'),
    t('waitScreen.statusInService'),
  ];
  const currentStepIndex = isInService ? 2 : isCalled ? 1 : 0;

  return (
    <Screen scroll={false}>
      <View style={styles.flex}>
        <ScreenHeader
          title={t('waitScreen.title')}
          subtitle={activeQueue.business_name}
          onBack={() => navigation.goBack()}
          rightAction={
            activeQueue.token_number ? (
              <Badge label={`#${activeQueue.token_number}`} tone="primary" />
            ) : undefined
          }
        />

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={activeQueueQuery.isRefetching}
              onRefresh={() => {
                void activeQueueQuery.refetch();
              }}
              tintColor={colors.primary}
            />
          }
        >
          {/* Live Queue Progress Stepper */}
          <Card variant="outlined" padding="md">
            <Stepper steps={progressSteps} currentStep={currentStepIndex} />
          </Card>

          {/* Animated Queue Position Hero */}
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <Card
              variant="selected"
              padding="xl"
              style={[
                styles.heroCard,
                getShadow(colors, 'md'),
                isCalled && {
                  backgroundColor: colors.warningLight,
                  borderColor: colors.warning,
                },
                isInService && {
                  backgroundColor: colors.successLight,
                  borderColor: colors.success,
                },
              ]}
            >
              <StatusBadge label={statusLabel} tone={statusTone} />

              <AppText
                variant="display"
                style={{
                  fontSize: 44,
                  lineHeight: 52,
                  color: isCalled
                    ? colors.warning
                    : isInService
                      ? colors.success
                      : colors.primary,
                  marginTop: spacing.xs,
                }}
              >
                {t('waitScreen.position', { position: activeQueue.position })}
              </AppText>

              <AppText variant="heading3" style={styles.centerText}>
                {activeQueue.people_ahead === 0
                  ? t('waitScreen.youAreNext')
                  : t('waitScreen.peopleAhead', { count: activeQueue.people_ahead })}
              </AppText>

              <View
                style={[
                  styles.waitTimePill,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                <Ionicons name="time-outline" size={16} color={colors.primary} />
                <AppText variant="bodyBold" style={{ color: colors.text }}>
                  {t('waitScreen.estimatedWait', {
                    minutes: activeQueue.estimated_wait_minutes,
                  })}
                </AppText>
              </View>
            </Card>
          </Animated.View>

          {/* Salon & Branch Card */}
          <Card variant="elevated" padding="lg">
            <View style={styles.rowCenter}>
              <View style={[styles.iconBox, { backgroundColor: colors.primaryLight }]}>
                <Ionicons name="storefront-outline" size={22} color={colors.primary} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <AppText variant="heading3">{activeQueue.business_name}</AppText>
                <AppText variant="caption" style={{ color: colors.textSecondary }}>
                  {activeQueue.branch_name}
                  {activeQueue.branch_address ? ` • ${activeQueue.branch_address}` : ''}
                </AppText>
              </View>
            </View>
          </Card>

          {/* Barber Assignment Card */}
          <Card variant="elevated" padding="lg">
            <AppText
              variant="label"
              style={{ color: colors.textMuted, marginBottom: spacing.sm }}
            >
              {t('waitScreen.barber')}
            </AppText>
            {activeQueue.barber_id && activeQueue.barber_name ? (
              <View style={styles.rowCenter}>
                <Avatar
                  name={activeQueue.barber_name}
                  uri={activeQueue.barber_avatar}
                  size="md"
                  status="online"
                />
                <View style={{ flex: 1 }}>
                  <AppText variant="heading3">{activeQueue.barber_name}</AppText>
                  <AppText variant="caption">{t('term.barber')}</AppText>
                </View>
              </View>
            ) : (
              <View style={styles.rowCenter}>
                <View style={[styles.iconBox, { backgroundColor: colors.primaryLight }]}>
                  <Ionicons name="people-outline" size={22} color={colors.primary} />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <AppText variant="bodyBold">{t('waitScreen.anyBarber')}</AppText>
                  <AppText variant="caption">{t('waitScreen.anyBarberSub')}</AppText>
                </View>
              </View>
            )}
          </Card>

          {/* Selected Services Breakdown */}
          {activeQueue.services && activeQueue.services.length > 0 ? (
            <Card variant="elevated" padding="lg">
              <AppText
                variant="label"
                style={{ color: colors.textMuted, marginBottom: spacing.sm }}
              >
                {t('waitScreen.selectedServices')}
              </AppText>
              <View style={{ gap: spacing.sm }}>
                {activeQueue.services.map((s) => (
                  <View key={s.id} style={styles.serviceRow}>
                    <View style={{ flex: 1 }}>
                      <AppText variant="bodyBold">{s.name}</AppText>
                      <AppText variant="caption">
                        {t('booking.duration', { mins: s.duration_minutes })}
                      </AppText>
                    </View>
                    <AppText variant="bodyBold">{formatCurrency(s.price)}</AppText>
                  </View>
                ))}
                <Divider spacingVertical="xs" />
                <View style={styles.serviceRow}>
                  <AppText variant="heading3">{t('waitScreen.total')}</AppText>
                  <AppText variant="numeric" style={{ color: colors.primary }}>
                    {formatCurrency(activeQueue.total_price)}
                  </AppText>
                </View>
              </View>
            </Card>
          ) : null}

          {activeQueue.status === 'WAITING' ? (
            <Button
              label={t('waitScreen.leaveQueue')}
              variant="danger"
              leftIcon="exit-outline"
              loading={leaveMutation.isPending}
              onPress={() => setConfirmLeaveOpen(true)}
            />
          ) : null}
        </ScrollView>

        <ConfirmationDialog
          visible={confirmLeaveOpen}
          title={t('waitScreen.leaveQueueConfirmTitle')}
          description={t('waitScreen.leaveQueueConfirmDesc')}
          confirmLabel={t('waitScreen.leaveQueueConfirmAction')}
          cancelLabel={t('common.cancel')}
          tone="danger"
          icon="exit-outline"
          loading={leaveMutation.isPending}
          onConfirm={() => leaveMutation.mutate()}
          onCancel={() => setConfirmLeaveOpen(false)}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    gap: spacing.md,
  },
  emptyWrap: {
    flex: 1,
    justifyContent: 'center',
  },
  scrollContent: {
    gap: spacing.md,
    paddingBottom: spacing.xxl,
  },
  heroCard: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  centerText: {
    textAlign: 'center',
  },
  waitTimePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.full,
    borderWidth: 1,
    marginTop: spacing.xs,
  },
  rowCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
