import { useQuery } from '@tanstack/react-query';
import { FlatList, StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { fetchServices, type Service } from '../../api/owner';
import { AppText } from '../../components/AppText';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Screen } from '../../components/Screen';
import { useT } from '../../i18n';
import { WorkspaceHeader } from '../../navigation/workspaces/WorkspaceHeader';
import type { OwnerStackParamList } from '../../navigation/types';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { formatCurrency } from '../../utils/format';

type Props = NativeStackScreenProps<OwnerStackParamList, 'ServiceList'>;

export function ServiceListScreen({ navigation }: Props) {
  const t = useT();
  const activeBranchId = useWorkspaceStore((s) => s.activeBranchId);

  const servicesQuery = useQuery({
    queryKey: ['services', activeBranchId],
    queryFn: () => fetchServices(activeBranchId!),
    enabled: Boolean(activeBranchId),
  });

  const renderItem = ({ item }: { item: Service }) => {
    return (
      <Card
        onPress={() =>
          navigation.navigate('ServiceEdit', {
            serviceId: item.id,
            branchId: activeBranchId!,
          })
        }
      >
        <View style={styles.cardHeader}>
          <View style={{ flex: 1, gap: 4 }}>
            <AppText variant="body" style={{ fontWeight: '700' }}>
              {item.name}
            </AppText>
            <AppText variant="caption">
              {t('service.durationMins', { minutes: item.duration_minutes })}
            </AppText>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 6 }}>
            <AppText variant="body" style={{ fontWeight: '700' }}>
              {formatCurrency(item.price)}
            </AppText>
            <Badge
              label={item.is_active ? t('service.active') : t('service.inactive')}
              variant={item.is_active ? 'success' : 'warning'}
            />
          </View>
        </View>
      </Card>
    );
  };

  return (
    <View style={{ flex: 1 }}>
      <WorkspaceHeader title={t('service.title')} onBack={() => navigation.goBack()} />
      <Screen>
        {!activeBranchId ? (
          <Card>
            <AppText variant="caption" style={{ textAlign: 'center' }}>
              {t('owner.noBranches')}
            </AppText>
            <View style={{ marginTop: 12 }}>
              <Button
                label={t('owner.createBranch')}
                onPress={() => navigation.navigate('BranchList')}
              />
            </View>
          </Card>
        ) : (
          <>
            <FlatList
              data={servicesQuery.data ?? []}
              keyExtractor={(item) => item.id}
              renderItem={renderItem}
              contentContainerStyle={styles.list}
              ListEmptyComponent={
                servicesQuery.isLoading ? null : (
                  <Card>
                    <AppText variant="caption" style={{ textAlign: 'center' }}>
                      {t('service.noServices')}
                    </AppText>
                  </Card>
                )
              }
            />
            <View style={{ marginTop: 12 }}>
              <Button
                label={t('service.add')}
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
  list: {
    gap: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
});
