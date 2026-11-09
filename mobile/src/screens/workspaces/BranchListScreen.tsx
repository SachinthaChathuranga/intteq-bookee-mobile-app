import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { fetchBranches, type Branch } from '../../api/owner';
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
  Screen,
  SkeletonCard,
  StatusBadge,
  haptics,
  radius,
  spacing,
} from '../../ui';

type Props = NativeStackScreenProps<OwnerStackParamList, 'BranchList'>;

export function BranchListScreen({ navigation }: Props) {
  const t = useT();
  const { colors } = useTheme();
  const activeBranchId = useWorkspaceStore((s) => s.activeBranchId);
  const setActiveBranchId = useWorkspaceStore((s) => s.setActiveBranchId);

  const branchesQuery = useQuery({
    queryKey: ['branches'],
    queryFn: fetchBranches,
  });

  const renderItem = ({ item }: { item: Branch }) => {
    const isCurrent = item.id === activeBranchId;
    const addressStr =
      typeof item.address === 'string'
        ? item.address
        : (item.address as any)?.address;

    return (
      <Card
        variant={isCurrent ? 'selected' : 'elevated'}
        padding="lg"
        onPress={() => navigation.navigate('BranchEdit', { branchId: item.id })}
      >
        <View style={styles.cardHeader}>
          <View
            style={[
              styles.branchIcon,
              {
                backgroundColor: isCurrent ? colors.primary : colors.primaryLight,
              },
            ]}
          >
            <Ionicons
              name="business-outline"
              size={22}
              color={isCurrent ? colors.onPrimary : colors.primary}
            />
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <AppText variant="heading3">{item.name}</AppText>
            {addressStr ? (
              <View style={styles.metaRow}>
                <Ionicons name="location-outline" size={14} color={colors.textMuted} />
                <AppText variant="caption" style={{ flex: 1 }} numberOfLines={1}>
                  {addressStr}
                </AppText>
              </View>
            ) : null}
            {item.phone ? (
              <View style={styles.metaRow}>
                <Ionicons name="call-outline" size={14} color={colors.textMuted} />
                <AppText variant="caption">{item.phone}</AppText>
              </View>
            ) : null}
          </View>
          <View style={styles.badgeStack}>
            {isCurrent ? (
              <StatusBadge label={t('owner.activeBranch')} tone="success" size="sm" />
            ) : null}
            <StatusBadge
              label={item.is_active ? t('service.active') : t('service.inactive')}
              tone={item.is_active ? 'primary' : 'warning'}
              size="sm"
            />
          </View>
        </View>

        {!isCurrent ? (
          <View style={{ marginTop: spacing.md }}>
            <Button
              variant="secondary"
              size="sm"
              label={t('owner.switchBranch')}
              leftIcon="checkmark-circle-outline"
              onPress={() => {
                haptics.selection();
                setActiveBranchId(item.id);
              }}
            />
          </View>
        ) : null}
      </Card>
    );
  };

  return (
    <View style={styles.flex}>
      <WorkspaceHeader
        title={t('owner.branches')}
        onBack={navigation.canGoBack() ? () => navigation.goBack() : undefined}
      />
      <Screen scroll={false}>
        <FlatList
          data={branchesQuery.data ?? []}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={branchesQuery.isRefetching}
              onRefresh={() => {
                void branchesQuery.refetch();
              }}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            branchesQuery.isLoading ? (
              <SkeletonCard />
            ) : (
              <EmptyState icon="business-outline" title={t('owner.noBranches')} />
            )
          }
        />
        <View style={styles.footer}>
          <Button
            label={t('owner.createBranch')}
            leftIcon="add-circle-outline"
            onPress={() => navigation.navigate('BranchEdit', {})}
          />
        </View>
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  list: {
    gap: spacing.md,
    paddingBottom: spacing.lg,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  branchIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  badgeStack: {
    alignItems: 'flex-end',
    gap: 6,
  },
  footer: {
    paddingTop: spacing.sm,
  },
});
