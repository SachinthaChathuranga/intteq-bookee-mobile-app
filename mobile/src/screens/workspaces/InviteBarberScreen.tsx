import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { createInvite } from '../../api/owner';
import { AppText } from '../../components/AppText';
import { useT } from '../../i18n';
import type { OwnerStackParamList } from '../../navigation/types';
import { WorkspaceHeader } from '../../navigation/workspaces/WorkspaceHeader';
import {
  Button,
  Card,
  Input,
  Screen,
  SegmentedControl,
  haptics,
  spacing,
} from '../../ui';

type Props = NativeStackScreenProps<OwnerStackParamList, 'InviteBarber'>;

export function InviteBarberScreen({ route, navigation }: Props) {
  const t = useT();
  const queryClient = useQueryClient();
  const { branchId } = route.params;

  const [phone, setPhone] = useState('');
  const [commissionType, setCommissionType] = useState<'PERCENTAGE' | 'FIXED'>(
    'PERCENTAGE',
  );
  const [commissionValue, setCommissionValue] = useState('40');
  const [error, setError] = useState<string | null>(null);

  const inviteMutation = useMutation({
    mutationFn: async () => {
      if (!phone.trim()) throw new Error(t('phone.required'));
      const val = parseFloat(commissionValue);
      if (isNaN(val) || val < 0)
        throw new Error('Valid commission value is required');
      if (commissionType === 'PERCENTAGE' && val > 100) {
        throw new Error('Percentage cannot exceed 100%');
      }

      return await createInvite(branchId, {
        phone: phone.trim(),
        commission_type: commissionType,
        commission_value: val,
      });
    },
    onSuccess: (data) => {
      haptics.success();
      queryClient.invalidateQueries({ queryKey: ['barbers', branchId] });
      const msg = t('barber.codeSent', { code: data.invite.code });
      Alert.alert(
        t('common.done'),
        data.sms_mock ? `${msg}\n\n[SMS Sent via notify.lk]: ${data.sms_mock}` : msg,
        [{ text: t('common.done'), onPress: () => navigation.goBack() }],
      );
    },
    onError: (err: any) => {
      setError(err?.message || t('common.error.generic'));
    },
  });

  return (
    <View style={styles.flex}>
      <WorkspaceHeader
        title={t('barber.invite')}
        onBack={() => navigation.goBack()}
      />
      <Screen scroll={false}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Card variant="elevated" padding="lg" style={styles.formCard}>
            <AppText variant="bodySmall">{t('barber.inviteSubtitle')}</AppText>

            <Input
              label={t('profile.phone')}
              placeholder="0771234567"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={(txt) => {
                setPhone(txt);
                setError(null);
              }}
              leftIcon="call-outline"
            />

            <View style={styles.section}>
              <AppText variant="label">{t('barber.commissionType')}</AppText>
              <SegmentedControl
                value={commissionType}
                onChange={(val) => {
                  setCommissionType(val);
                  setCommissionValue(val === 'PERCENTAGE' ? '40' : '200');
                }}
                options={[
                  { key: 'PERCENTAGE', label: t('barber.commissionPercent') },
                  { key: 'FIXED', label: t('barber.commissionFixed') },
                ]}
              />
            </View>

            <Input
              label={t('barber.commissionValue')}
              placeholder={commissionType === 'PERCENTAGE' ? '40' : '200'}
              keyboardType="numeric"
              value={commissionValue}
              onChangeText={setCommissionValue}
              leftIcon="cash-outline"
            />
          </Card>

          {error ? <AppText variant="error">{error}</AppText> : null}

          <Button
            label={t('barber.sendInvite')}
            size="lg"
            leftIcon="send-outline"
            onPress={() => inviteMutation.mutate()}
            loading={inviteMutation.isPending}
          />
        </ScrollView>
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  scroll: {
    gap: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  formCard: {
    gap: spacing.md,
  },
  section: {
    gap: spacing.xs + 2,
  },
});
