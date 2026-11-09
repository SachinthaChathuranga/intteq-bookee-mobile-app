import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import {
  cancelInvite,
  fetchBarbersAndInvites,
  type InviteDetail,
} from '../../api/owner';
import { AppText } from '../../components/AppText';
import { CommissionBadge } from '../../features/salon/CommissionBadge';
import { useT } from '../../i18n';
import type { OwnerStackParamList } from '../../navigation/types';
import { WorkspaceHeader } from '../../navigation/workspaces/WorkspaceHeader';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { useTheme } from '../../theme/ThemeProvider';
import {
  Avatar,
  Button,
  Card,
  ConfirmationDialog,
  EmptyState,
  Screen,
  SectionHeader,
  SkeletonCard,
  StatusBadge,
  haptics,
  radius,
  spacing,
  useToast,
} from '../../ui';

type Props = NativeStackScreenProps<OwnerStackParamList, 'BarberList'>;

export function BarberListScreen({ navigation }: Props) {
  const t = useT();
  const { colors } = useTheme();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const activeBranchId = useWorkspaceStore((s) => s.activeBranchId);

  const [revokingInvite, setRevokingInvite] = useState<InviteDetail | null>(null);

  const barbersQuery = useQuery({
    queryKey: ['barbers', activeBranchId],
    queryFn: () => fetchBarbersAndInvites(activeBranchId!),
    enabled: Boolean(activeBranchId),
  });

  const cancelMutation = useMutation({
    mutationFn: (inviteId: string) => cancelInvite(activeBranchId!, inviteId),
    onSuccess: () => {
      haptics.medium();
      setRevokingInvite(null);
      queryClient.invalidateQueries({ queryKey: ['barbers', activeBranchId] });
    },
    onError: () => {
      setRevokingInvite(null);
      showToast({ title: t('common.error.generic'), tone: 'error' });
    },
  });

  const barbers = barbersQuery.data?.barbers ?? [];
  const pendingInvites = (barbersQuery.data?.invites ?? []).filter(
    (i) => i.status === 'PENDING',
  );

  return (
    <View style={styles.flex}>
      <WorkspaceHeader
        title={t('barber.title')}
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
          <ScrollView
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={barbersQuery.isRefetching}
                onRefresh={() => {
                  void barbersQuery.refetch();
                }}
                tintColor={colors.primary}
              />
            }
          >
            {/* Active Barbers */}
            <View style={styles.section}>
              <SectionHeader title={`${t('barber.activeBarbers')} (${barbers.length})`} />

              {barbersQuery.isLoading ? (
                <SkeletonCard />
              ) : barbers.length === 0 ? (
                <EmptyState compact icon="people-outline" title={t('barber.noBarbers')} />
              ) : (
                barbers.map((barber) => (
                  <Card key={barber.id} variant="elevated" padding="lg">
                    <View style={styles.cardRow}>
                      <Avatar
                        name={barber.name || barber.phone}
                        size="md"
                        status={barber.is_active ? 'online' : 'offline'}
                      />
                      <View style={{ flex: 1, gap: 4 }}>
                        <AppText variant="heading3">{barber.name}</AppText>
                        <AppText variant="caption">{barber.phone}</AppText>
                        <View style={{ marginTop: 2 }}>
                          <CommissionBadge
                            type={barber.commission_type}
                            value={barber.commission_value}
                          />
                        </View>
                      </View>
                      <StatusBadge
                        label={
                          barber.is_active
                            ? t('barber.statusActive')
                            : t('barber.statusInactive')
                        }
                        tone={barber.is_active ? 'success' : 'warning'}
                        size="sm"
                      />
                    </View>
                  </Card>
                ))
              )}
            </View>

            {/* Pending Invites */}
            <View style={styles.section}>
              <SectionHeader
                title={`${t('barber.invitesPending')} (${pendingInvites.length})`}
              />

              {pendingInvites.length === 0 ? (
                <EmptyState compact icon="mail-outline" title={t('barber.noInvites')} />
              ) : (
                pendingInvites.map((invite) => (
                  <Card key={invite.id} variant="outlined" padding="lg">
                    <View style={styles.cardRow}>
                      <View style={{ flex: 1, gap: 6 }}>
                        <AppText variant="bodyBold">{invite.phone}</AppText>
                        <View
                          style={[
                            styles.codePill,
                            {
                              backgroundColor: colors.primaryLight,
                              borderColor: colors.primaryBorder,
                            },
                          ]}
                        >
                          <AppText
                            variant="heading3"
                            style={{
                              letterSpacing: 3,
                              color: colors.primary,
                              fontWeight: '800',
                            }}
                          >
                            {invite.code}
                          </AppText>
                        </View>
                        <CommissionBadge
                          type={invite.commission_type}
                          value={invite.commission_value}
                        />
                      </View>
                      <Button
                        label={t('barber.cancelInvite')}
                        variant="danger"
                        size="sm"
                        fullWidth={false}
                        onPress={() => setRevokingInvite(invite)}
                      />
                    </View>
                  </Card>
                ))
              )}
            </View>

            <Button
              label={t('barber.invite')}
              leftIcon="person-add-outline"
              onPress={() =>
                navigation.navigate('InviteBarber', {
                  branchId: activeBranchId,
                })
              }
            />
          </ScrollView>
        )}

        <ConfirmationDialog
          visible={Boolean(revokingInvite)}
          title={t('barber.cancelInvite')}
          description={revokingInvite?.phone}
          confirmLabel={t('barber.cancelInvite')}
          cancelLabel={t('common.cancel')}
          tone="danger"
          icon="close-circle-outline"
          loading={cancelMutation.isPending}
          onConfirm={() => {
            if (revokingInvite) {
              cancelMutation.mutate(revokingInvite.id);
            }
          }}
          onCancel={() => setRevokingInvite(null)}
        />
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  scroll: {
    gap: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  section: {
    gap: spacing.md,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  codePill: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
});
