import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { fetchServices, type Service } from '../../api/owner';
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
  radius,
  spacing,
} from '../../ui';
import { formatCurrency } from '../../utils/format';

type Props = NativeStackScreenProps<OwnerStackParamList, 'ServiceList'>;

export function ServiceListScreen({ navigation }: Props) {
  const t = useT();
  const { colors } = useTheme();
  const activeBranchId = useWorkspaceStore((s) => s.activeBranchId);

  const servicesQuery = useQuery({
    queryKey: ['services', activeBranchId],
    queryFn: () => fetchServices(activeBranchId!),
    enabled: Boolean(activeBranchId),
  });

  const renderItem = ({ item }: { item: Service }) => (
    <Card
      variant="elevated"
      padding="lg"
      onPress={() =>
        navigation.navigate('ServiceEdit', {
          serviceId: item.id,
          branchId: activeBranchId!,
        })
      }
    >
      <View style={styles.cardHeader}>
        <View style={[styles.iconBox, { backgroundColor: colors.primaryLight }]}>
          <Ionicons name="cut-outline" size={20} color={colors.primary} />
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <AppText variant="heading3">{item.name}</AppText>
          <View style={styles.metaRow}>
            <Ionicons name="time-outline" size={14} color={colors.textMuted} />
            <AppText variant="caption">
              {t('service.durationMins', { minutes: item.duration_minutes })}
            </AppText>
          </View>
        </View>
        <View style={styles.rightStack}>
          <AppText variant="heading3" style={{ color: colors.primary }}>
            {formatCurrency(item.price)}
          </AppText>
          <StatusBadge
            label={item.is_active ? t('service.active') : t('service.inactive')}
            tone={item.is_active ? 'success' : 'warning'}
            size="sm"
          />
        </View>
      </View>
    </Card>
  );

  return (
    <View style={styles.flex}>
      <WorkspaceHeader
        title={t('service.title')}
        onBack={navigation.canGoBack() ? () => navigation.goBack() : undefined}
      />
      <Screen scroll={false}>
        {!activeBranchId ? (
          <EmptyState
            icon="business-outline"
            title={t('owner.noBranches')}
            actionLabel={t('owner.createBranch')}
            onActionPress={() => navigation.navigate('BranchList')}
          />
        ) : (
          <>
            <FlatList
              data={servicesQuery.data ?? []}
              keyExtractor={(item) => item.id}
              renderItem={renderItem}
              contentContainerStyle={styles.list}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={servicesQuery.isRefetching}
                  onRefresh={() => {
                    void servicesQuery.refetch();
                  }}
                  tintColor={colors.primary}
                />
              }
              ListEmptyComponent={
                servicesQuery.isLoading ? (
                  <SkeletonCard />
                ) : (
                  <EmptyState icon="cut-outline" title={t('service.noServices')} />
                )
              }
            />
            <View style={styles.footer}>
              <Button
                label={t('service.add')}
                leftIcon="add-circle-outline"
                onPress={() =>
                  navigation.navigate('ServiceEdit', {
                    branchId: activeBranchId,
                  })
                }
              />
            </View>
          </>
        )}
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
    alignItems: 'center',
    gap: spacing.md,
  },
  iconBox: {
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
  rightStack: {
    alignItems: 'flex-end',
    gap: 6,
  },
  footer: {
    paddingTop: spacing.sm,
  },
});
