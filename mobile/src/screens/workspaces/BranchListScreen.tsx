import { useQuery } from '@tanstack/react-query';
import { FlatList, StyleSheet, TouchableOpacity, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { fetchBranches, type Branch } from '../../api/owner';
import { AppText } from '../../components/AppText';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Screen } from '../../components/Screen';
import { useT } from '../../i18n';
import { WorkspaceHeader } from '../../navigation/workspaces/WorkspaceHeader';
import type { OwnerStackParamList } from '../../navigation/types';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { useTheme } from '../../theme/ThemeProvider';

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
    const addressStr = typeof item.address === 'string' ? item.address : (item.address as any)?.address;

    return (
      <Card onPress={() => navigation.navigate('BranchEdit', { branchId: item.id })}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1, gap: 4 }}>
            <AppText variant="body" style={{ fontWeight: '700' }}>
              {item.name}
            </AppText>
            {addressStr ? (
              <AppText variant="caption">{addressStr}</AppText>
            ) : null}
            {item.phone ? (
              <AppText variant="caption">{item.phone}</AppText>
            ) : null}
          </View>
          <View style={{ alignItems: 'flex-end', gap: 6 }}>
            {isCurrent && <Badge label={t('owner.activeBranch')} variant="success" />}
            <Badge label={item.is_active ? t('service.active') : t('service.inactive')} variant={item.is_active ? 'primary' : 'warning'} />
          </View>
        </View>

        {!isCurrent && (
          <View style={{ marginTop: 12 }}>
            <Button
              variant="secondary"
              label={t('owner.switchBranch')}
              onPress={() => setActiveBranchId(item.id)}
            />
          </View>
        )}
      </Card>
    );
  };

  return (
    <View style={{ flex: 1 }}>
      <WorkspaceHeader title={t('owner.branches')} onBack={() => navigation.goBack()} />
      <Screen>
        <FlatList
          data={branchesQuery.data ?? []}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            branchesQuery.isLoading ? null : (
              <Card>
                <AppText variant="caption" style={{ textAlign: 'center' }}>
                  {t('owner.noBranches')}
                </AppText>
              </Card>
            )
          }
        />
        <View style={{ marginTop: 12 }}>
          <Button
            label={t('owner.createBranch')}
            onPress={() => navigation.navigate('BranchEdit', {})}
          />
        </View>
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
