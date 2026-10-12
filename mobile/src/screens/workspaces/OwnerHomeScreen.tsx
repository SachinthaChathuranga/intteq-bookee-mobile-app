import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { fetchBranches } from '../../api/owner';
import { AppText } from '../../components/AppText';
import { useT } from '../../i18n';
import type { OwnerStackParamList } from '../../navigation/types';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { useTheme } from '../../theme/ThemeProvider';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ListItem,
  Screen,
  SkeletonCard,
  haptics,
  radius,
  spacing,
} from '../../ui';

type Props = NativeStackScreenProps<OwnerStackParamList, 'OwnerHome'>;

export function OwnerHomeScreen({ navigation }: Props) {
  const t = useT();
  const { colors } = useTheme();
  const activeWorkspace = useWorkspaceStore((s) => s.activeWorkspace);
  const activeBranchId = useWorkspaceStore((s) => s.activeBranchId);
  const setActiveBranchId = useWorkspaceStore((s) => s.setActiveBranchId);

  const branchesQuery = useQuery({
    queryKey: ['branches'],
    queryFn: fetchBranches,
  });

  const branches = branchesQuery.data ?? [];
  const activeBranch = branches.find((b) => b.id === activeBranchId) ?? branches[0] ?? null;

  useEffect(() => {
    if (branches.length > 0 && (!activeBranchId || !branches.some((b) => b.id === activeBranchId))) {
      setActiveBranchId(branches[0].id);
    }
  }, [branches, activeBranchId, setActiveBranchId]);

  const activeAddress =
    typeof activeBranch?.address === 'string'
      ? activeBranch.address
      : (activeBranch?.address as any)?.address;

  return (
    <Screen
      scrollable
      refreshing={branchesQuery.isRefetching}
      onRefresh={() => branchesQuery.refetch()}
      contentContainerStyle={styles.container}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <AppText variant="caption" style={{ color: colors.textMuted, fontWeight: '700' }}>
            {activeWorkspace?.business_name ?? t('workspace.owner.title')}
          </AppText>
          <AppText variant="title" style={styles.title}>
            {t('nav.overview')}
          </AppText>
        </View>
        <Badge label={t('role.OWNER')} variant="primary" />
      </View>

      {/* Active Branch Section */}
      {branchesQuery.isLoading ? (
        <SkeletonCard height={140} />
      ) : activeBranch ? (
        <Card style={styles.branchCard}>
          <View style={styles.branchHeader}>
            <View style={{ flex: 1, gap: 4 }}>
              <AppText variant="caption" style={{ color: colors.textMuted, fontWeight: '700' }}>
                {t('owner.activeBranch')}
              </AppText>
              <AppText variant="heading" style={{ fontSize: 20 }}>
                {activeBranch.name}
              </AppText>
              {activeAddress ? (
                <AppText variant="caption" style={{ color: colors.textMuted }}>
                  {activeAddress}
                </AppText>
              ) : null}
            </View>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                haptics.light();
                navigation.navigate('BranchList');
              }}
              style={[styles.switchPill, { borderColor: colors.primary }]}
            >
              <AppText variant="caption" style={{ color: colors.primary, fontWeight: '700' }}>
                {t('owner.switchBranch')}
              </AppText>
            </TouchableOpacity>
          </View>
        </Card>
      ) : (
        <EmptyState
          icon="business-outline"
          title={t('owner.noBranches')}
          description="Create your first branch to start configuring services and staff."
          actionLabel={t('owner.createBranch')}
          onAction={() => navigation.navigate('BranchEdit', {})}
        />
      )}

      {/* Management Sections List */}
      <View style={styles.section}>
        <AppText variant="heading" style={{ fontSize: 18 }}>
          Management
        </AppText>

        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <ListItem
            title={t('owner.branches')}
            subtitle={t('owner.branchesSubtitle')}
            left={<Ionicons name="business-outline" size={22} color={colors.primary} />}
            onPress={() => {
              haptics.light();
              navigation.navigate('BranchList');
            }}
          />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <ListItem
            title={t('owner.services')}
            subtitle={t('owner.servicesSubtitle')}
            left={<Ionicons name="cut-outline" size={22} color={colors.primary} />}
            onPress={() => {
              haptics.light();
              if (activeBranch) {
                navigation.navigate('ServiceList');
              } else {
                navigation.navigate('BranchList');
              }
            }}
          />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <ListItem
            title={t('owner.barbers')}
            subtitle={t('owner.barbersSubtitle')}
            left={<Ionicons name="people-outline" size={22} color={colors.primary} />}
            onPress={() => {
              haptics.light();
              if (activeBranch) {
                navigation.navigate('BarberList');
              } else {
                navigation.navigate('BranchList');
              }
            }}
          />
        </Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  branchCard: {
    gap: spacing.sm,
  },
  branchHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  switchPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1.5,
  },
  section: {
    gap: spacing.sm,
  },
  divider: {
    height: 1,
    marginLeft: 56,
  },
});
