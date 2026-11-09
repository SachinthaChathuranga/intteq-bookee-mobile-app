import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import {
  fetchBarbersAndInvites,
  fetchBranches,
  fetchServices,
} from '../../api/owner';
import { fetchBranchLiveFloor } from '../../api/receptionist';
import { useQueueSocket } from '../../api/socket';
import { AppText } from '../../components/AppText';
import { useT } from '../../i18n';
import type { OwnerStackParamList } from '../../navigation/types';
import { WorkspaceHeader } from '../../navigation/workspaces/WorkspaceHeader';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { useTheme } from '../../theme/ThemeProvider';
import {
  Button,
  Card,
  EmptyState,
  FinancialSummaryCard,
  Screen,
  SectionHeader,
  SkeletonCard,
  StatusBadge,
  radius,
  spacing,
} from '../../ui';

type Props = NativeStackScreenProps<OwnerStackParamList, 'OwnerHome'>;

export function OwnerHomeScreen({ navigation }: Props) {
  const t = useT();
  const { colors } = useTheme();
  const activeBranchId = useWorkspaceStore((s) => s.activeBranchId);
  const setActiveBranchId = useWorkspaceStore((s) => s.setActiveBranchId);

  const branchesQuery = useQuery({
    queryKey: ['branches'],
    queryFn: fetchBranches,
  });

  useEffect(() => {
    if (
      branchesQuery.data &&
      branchesQuery.data.length > 0 &&
      !activeBranchId
    ) {
      setActiveBranchId(branchesQuery.data[0].id);
    }
  }, [branchesQuery.data, activeBranchId, setActiveBranchId]);

  useQueueSocket(activeBranchId);

  const floorQuery = useQuery({
    queryKey: ['live-floor', activeBranchId],
    queryFn: () => fetchBranchLiveFloor(activeBranchId!),
    enabled: Boolean(activeBranchId),
  });

  const servicesQuery = useQuery({
    queryKey: ['services', activeBranchId],
    queryFn: () => fetchServices(activeBranchId!),
    enabled: Boolean(activeBranchId),
  });

  const barbersQuery = useQuery({
    queryKey: ['barbers', activeBranchId],
    queryFn: () => fetchBarbersAndInvites(activeBranchId!),
    enabled: Boolean(activeBranchId),
  });

  const branches = branchesQuery.data ?? [];
  const activeBranch =
    branches.find((b) => b.id === activeBranchId) ?? branches[0] ?? null;

  const activeAddressStr = activeBranch
    ? typeof activeBranch.address === 'string'
      ? activeBranch.address
      : (activeBranch.address as any)?.address
    : null;

  const activeServicesCount = (servicesQuery.data ?? []).filter(
    (s) => s.is_active,
  ).length;
  const totalBarbersCount = (barbersQuery.data?.barbers ?? []).length;

  const handleRefresh = () => {
    void Promise.all([
      branchesQuery.refetch(),
      floorQuery.refetch(),
      servicesQuery.refetch(),
      barbersQuery.refetch(),
    ]);
  };

  const managementItems: {
    title: string;
    subtitle: string;
    icon: keyof typeof Ionicons.glyphMap;
    onPress: () => void;
  }[] = [
    {
      title: t('owner.branches'),
      subtitle: t('owner.branchesSubtitle'),
      icon: 'business-outline',
      onPress: () => navigation.navigate('BranchList'),
    },
    {
      title: t('owner.services'),
      subtitle: t('owner.servicesSubtitle'),
      icon: 'cut-outline',
      onPress: () => navigation.navigate('ServiceList'),
    },
    {
      title: t('owner.barbers'),
      subtitle: t('owner.barbersSubtitle'),
      icon: 'people-outline',
      onPress: () => navigation.navigate('BarberList'),
    },
  ];

  return (
    <View style={styles.flex}>
      <WorkspaceHeader title={t('workspace.owner.title')} />
      <Screen scroll={false} padded={false}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={branchesQuery.isRefetching || floorQuery.isRefetching}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          }
        >
          {/* Active Branch Selector Card */}
          {branchesQuery.isLoading ? (
            <SkeletonCard />
          ) : !activeBranch ? (
            <EmptyState
              icon="business-outline"
              title={t('owner.noBranches')}
              actionLabel={t('owner.createBranch')}
              onActionPress={() => navigation.navigate('BranchEdit', {})}
            />
          ) : (
            <Card variant="selected" padding="lg">
              <View style={styles.rowBetween}>
                <View style={{ flex: 1, gap: 4 }}>
                  <StatusBadge label={t('owner.activeBranch')} tone="success" size="sm" />
                  <AppText variant="heading2" style={{ marginTop: 2 }}>
                    {activeBranch.name}
                  </AppText>
                  {activeAddressStr ? (
                    <View style={styles.metaRow}>
                      <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
                      <AppText variant="caption" style={{ color: colors.textSecondary }}>
                        {activeAddressStr}
                      </AppText>
                    </View>
                  ) : null}
                </View>
                {branches.length > 1 ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    fullWidth={false}
                    label={t('owner.switchBranch')}
                    leftIcon="swap-horizontal-outline"
                    onPress={() => navigation.navigate('BranchList')}
                  />
                ) : null}
              </View>
            </Card>
          )}

          {/* Live Branch Pulse Metrics */}
          {activeBranch ? (
            <View style={styles.sectionBlock}>
              <SectionHeader title={t('owner.liveOverviewSection')} />
              <View style={styles.metricsGrid}>
                <View style={styles.metricsRow}>
                  <FinancialSummaryCard
                    icon="cut-outline"
                    label={t('owner.activeBarbersMetric')}
                    value={String(floorQuery.data?.active_barbers_count ?? 0)}
                    tone="success"
                  />
                  <FinancialSummaryCard
                    icon="people-outline"
                    label={t('owner.waitingQueueMetric')}
                    value={String(floorQuery.data?.total_waiting_count ?? 0)}
                    tone="primary"
                  />
                </View>
                <View style={styles.metricsRow}>
                  <FinancialSummaryCard
                    icon="sparkles-outline"
                    label={t('owner.servicesMetric')}
                    value={String(activeServicesCount)}
                    tone="info"
                  />
                  <FinancialSummaryCard
                    icon="id-card-outline"
                    label={t('owner.teamMetric')}
                    value={String(totalBarbersCount)}
                    tone="warning"
                  />
                </View>
              </View>
            </View>
          ) : null}

          {/* Salon Configuration Cards */}
          <View style={styles.sectionBlock}>
            <SectionHeader title={t('owner.managementSection')} />
            <View style={styles.stackSm}>
              {managementItems.map((item) => (
                <Card
                  key={item.title}
                  variant="elevated"
                  padding="lg"
                  onPress={item.onPress}
                >
                  <View style={styles.rowCenter}>
                    <View
                      style={[
                        styles.iconBox,
                        {
                          backgroundColor: colors.primaryLight,
                          borderColor: colors.primaryBorder,
                        },
                      ]}
                    >
                      <Ionicons name={item.icon} size={22} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <AppText variant="heading3">{item.title}</AppText>
                      <AppText variant="caption" style={{ color: colors.textSecondary }}>
                        {item.subtitle}
                      </AppText>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                  </View>
                </Card>
              ))}
            </View>
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
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sectionBlock: {
    gap: spacing.md,
  },
  metricsGrid: {
    gap: spacing.md,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  stackSm: {
    gap: spacing.sm + 2,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
