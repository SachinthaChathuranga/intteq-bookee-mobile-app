import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { fetchBranches } from '../../api/owner';
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

type Props = NativeStackScreenProps<OwnerStackParamList, 'OwnerHome'>;

export function OwnerHomeScreen({ navigation }: Props) {
  const t = useT();
  const { colors } = useTheme();
  const clearWorkspace = useWorkspaceStore((s) => s.clearWorkspace);
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
    <View style={{ flex: 1 }}>
      <WorkspaceHeader title={t('workspace.owner.title')} />
      <Screen>
        {/* Active Branch Section */}
        {activeBranch ? (
          <Card>
            <View style={styles.branchHeader}>
              <View style={{ flex: 1, gap: 2 }}>
                <AppText variant="caption">{t('owner.activeBranch')}</AppText>
                <AppText variant="title" style={{ fontSize: 20 }}>
                  {activeBranch.name}
                </AppText>
                {activeAddress ? (
                  <AppText variant="caption">{activeAddress}</AppText>
                ) : null}
              </View>
              <TouchableOpacity
                onPress={() => navigation.navigate('BranchList')}
                style={[styles.switchPill, { borderColor: colors.primary }]}
              >
                <AppText variant="caption" style={{ color: colors.primary, fontWeight: '700' }}>
                  {t('owner.switchBranch')}
                </AppText>
              </TouchableOpacity>
            </View>
          </Card>
        ) : (
          <Card>
            <AppText variant="body" style={{ fontWeight: '700', textAlign: 'center' }}>
              {t('owner.noBranches')}
            </AppText>
            <View style={{ marginTop: 12 }}>
              <Button
                label={t('owner.createBranch')}
                onPress={() => navigation.navigate('BranchEdit', {})}
              />
            </View>
          </Card>
        )}

        {/* Setup Navigation Tiles */}
        <View style={styles.tilesContainer}>
          {/* Branches Tile */}
          <Card onPress={() => navigation.navigate('BranchList')}>
            <View style={styles.tileRow}>
              <View style={{ flex: 1, gap: 4 }}>
                <AppText variant="body" style={{ fontWeight: '700' }}>
                  {t('owner.branches')}
                </AppText>
                <AppText variant="caption">{t('owner.branchesSubtitle')}</AppText>
              </View>
              <AppText style={{ color: colors.primary, fontSize: 18, fontWeight: '700' }}>
                →
              </AppText>
            </View>
          </Card>

          {/* Services & Prices Tile */}
          <Card
            onPress={() => {
              if (activeBranch) {
                navigation.navigate('ServiceList');
              } else {
                navigation.navigate('BranchList');
              }
            }}
          >
            <View style={styles.tileRow}>
              <View style={{ flex: 1, gap: 4 }}>
                <AppText variant="body" style={{ fontWeight: '700' }}>
                  {t('owner.services')}
                </AppText>
                <AppText variant="caption">{t('owner.servicesSubtitle')}</AppText>
              </View>
              <AppText style={{ color: colors.primary, fontSize: 18, fontWeight: '700' }}>
                →
              </AppText>
            </View>
          </Card>

          {/* Barbers & Invites Tile */}
          <Card
            onPress={() => {
              if (activeBranch) {
                navigation.navigate('BarberList');
              } else {
                navigation.navigate('BranchList');
              }
            }}
          >
            <View style={styles.tileRow}>
              <View style={{ flex: 1, gap: 4 }}>
                <AppText variant="body" style={{ fontWeight: '700' }}>
                  {t('owner.barbers')}
                </AppText>
                <AppText variant="caption">{t('owner.barbersSubtitle')}</AppText>
              </View>
              <AppText style={{ color: colors.primary, fontSize: 18, fontWeight: '700' }}>
                →
              </AppText>
            </View>
          </Card>
        </View>

        {/* Back to Customer App */}
        <View style={{ marginTop: 'auto', paddingTop: 16 }}>
          <Button
            variant="secondary"
            label={t('workspace.backToCustomer')}
            onPress={clearWorkspace}
          />
        </View>
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  branchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  switchPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  tilesContainer: {
    gap: 12,
    marginTop: 8,
  },
  tileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
