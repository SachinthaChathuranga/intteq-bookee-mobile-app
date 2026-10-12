import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, FlatList, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { cancelInvite, fetchBarbersAndInvites, type BarberDetail, type InviteDetail } from '../../api/owner';
import { AppText } from '../../components/AppText';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Screen } from '../../components/Screen';
import { CommissionBadge } from '../../features/salon/CommissionBadge';
import { useT } from '../../i18n';
import { WorkspaceHeader } from '../../navigation/workspaces/WorkspaceHeader';
import type { OwnerStackParamList } from '../../navigation/types';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { useTheme } from '../../theme/ThemeProvider';

type Props = NativeStackScreenProps<OwnerStackParamList, 'BarberList'>;

export function BarberListScreen({ navigation }: Props) {
  const t = useT();
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const activeBranchId = useWorkspaceStore((s) => s.activeBranchId);

  const barbersQuery = useQuery({
    queryKey: ['barbers', activeBranchId],
    queryFn: () => fetchBarbersAndInvites(activeBranchId!),
    enabled: Boolean(activeBranchId),
  });

  const cancelMutation = useMutation({
    mutationFn: (inviteId: string) => cancelInvite(activeBranchId!, inviteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['barbers', activeBranchId] });
    },
    onError: () => {
      Alert.alert('Error', t('common.error.generic'));
    },
  });

  const barbers = barbersQuery.data?.barbers ?? [];
  const pendingInvites = (barbersQuery.data?.invites ?? []).filter((i) => i.status === 'PENDING');

  return (
    <View style={{ flex: 1 }}>
      <WorkspaceHeader title={t('barber.title')} onBack={() => navigation.goBack()} />
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
          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            {/* Active Barbers */}
            <View style={styles.section}>
              <AppText variant="body" style={{ fontWeight: '700' }}>
                {t('barber.activeBarbers')}
              </AppText>

              {barbers.length === 0 ? (
                <Card>
                  <AppText variant="caption">{t('barber.noBarbers')}</AppText>
                </Card>
              ) : (
                barbers.map((barber) => (
                  <Card key={barber.id}>
                    <View style={styles.cardRow}>
                      <View style={{ flex: 1, gap: 4 }}>
                        <AppText variant="body" style={{ fontWeight: '700' }}>
                          {barber.name}
                        </AppText>
                        <AppText variant="caption">{barber.phone}</AppText>
                        <CommissionBadge
                          type={barber.commission_type}
                          value={barber.commission_value}
                        />
                      </View>
                      <Badge
                        label={barber.is_active ? t('barber.statusActive') : t('barber.statusInactive')}
                        variant={barber.is_active ? 'success' : 'warning'}
                      />
                    </View>
                  </Card>
                ))
              )}
            </View>

            {/* Pending Invites */}
            <View style={styles.section}>
              <AppText variant="body" style={{ fontWeight: '700' }}>
                {t('barber.invitesPending')}
              </AppText>

              {pendingInvites.length === 0 ? (
                <Card>
                  <AppText variant="caption">{t('barber.noInvites')}</AppText>
                </Card>
              ) : (
                pendingInvites.map((invite) => (
                  <Card key={invite.id}>
                    <View style={styles.cardRow}>
                      <View style={{ flex: 1, gap: 4 }}>
                        <AppText variant="body" style={{ fontWeight: '700' }}>
                          {invite.phone}
                        </AppText>
                        <AppText
                          variant="body"
                          style={{
                            fontWeight: '800',
                            letterSpacing: 2,
                            color: colors.primary,
                          }}
                        >
                          {invite.code}
                        </AppText>
                        <CommissionBadge
                          type={invite.commission_type}
                          value={invite.commission_value}
                        />
                      </View>
                      <TouchableOpacity
                        onPress={() => cancelMutation.mutate(invite.id)}
                        style={[
                          styles.cancelBtn,
                          { borderColor: colors.danger },
                        ]}
                      >
                        <AppText
                          variant="caption"
                          style={{ color: colors.danger, fontWeight: '600' }}
                        >
                          {t('barber.cancelInvite')}
                        </AppText>
                      </TouchableOpacity>
                    </View>
                  </Card>
                ))
              )}
            </View>

            {/* Invite Button */}
            <View style={{ marginTop: 8 }}>
              <Button
                label={t('barber.invite')}
                onPress={() =>
                  navigation.navigate('InviteBarber', {
                    branchId: activeBranchId,
                  })
                }
              />
            </View>
          </ScrollView>
        )}
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    gap: 18,
    paddingBottom: 40,
  },
  section: {
    gap: 10,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cancelBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
});
