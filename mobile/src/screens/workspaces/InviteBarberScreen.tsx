import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Alert, StyleSheet, TouchableOpacity, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { createInvite } from '../../api/owner';
import { AppText } from '../../components/AppText';
import { Button } from '../../components/Button';
import { Screen } from '../../components/Screen';
import { TextField } from '../../components/TextField';
import { useT } from '../../i18n';
import { WorkspaceHeader } from '../../navigation/workspaces/WorkspaceHeader';
import type { OwnerStackParamList } from '../../navigation/types';
import { useTheme } from '../../theme/ThemeProvider';

type Props = NativeStackScreenProps<OwnerStackParamList, 'InviteBarber'>;

export function InviteBarberScreen({ route, navigation }: Props) {
  const t = useT();
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const { branchId } = route.params;

  const [phone, setPhone] = useState('');
  const [commissionType, setCommissionType] = useState<'PERCENTAGE' | 'FIXED'>('PERCENTAGE');
  const [commissionValue, setCommissionValue] = useState('40');
  const [error, setError] = useState<string | null>(null);

  const inviteMutation = useMutation({
    mutationFn: async () => {
      if (!phone.trim()) throw new Error(t('phone.required'));
      const val = parseFloat(commissionValue);
      if (isNaN(val) || val < 0) throw new Error('Valid commission value is required');
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
      queryClient.invalidateQueries({ queryKey: ['barbers', branchId] });
      const msg = t('barber.codeSent', { code: data.invite.code });
      Alert.alert(
        t('common.done'),
        data.sms_mock ? `${msg}\n\n[SMS Sent via notify.lk]: ${data.sms_mock}` : msg,
        [{ text: t('common.done'), onPress: () => navigation.goBack() }]
      );
    },
    onError: (err: any) => {
      setError(err?.message || t('common.error.generic'));
    },
  });

  return (
    <View style={{ flex: 1 }}>
      <WorkspaceHeader title={t('barber.invite')} onBack={() => navigation.goBack()} />
      <Screen>
        <View style={styles.form}>
          <AppText variant="caption">{t('barber.inviteSubtitle')}</AppText>

          <TextField
            label={t('profile.phone')}
            placeholder="0771234567"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={(txt) => {
              setPhone(txt);
              setError(null);
            }}
          />

          <View style={styles.section}>
            <AppText variant="caption">{t('barber.commissionType')}</AppText>
            <View style={styles.toggleRow}>
              <TouchableOpacity
                onPress={() => {
                  setCommissionType('PERCENTAGE');
                  setCommissionValue('40');
                }}
                style={[
                  styles.toggleBtn,
                  {
                    backgroundColor: commissionType === 'PERCENTAGE' ? colors.primary : colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <AppText
                  variant="body"
                  style={{
                    color: commissionType === 'PERCENTAGE' ? colors.onPrimary : colors.text,
                    fontWeight: '600',
                  }}
                >
                  {t('barber.commissionPercent')}
                </AppText>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setCommissionType('FIXED');
                  setCommissionValue('200');
                }}
                style={[
                  styles.toggleBtn,
                  {
                    backgroundColor: commissionType === 'FIXED' ? colors.primary : colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <AppText
                  variant="body"
                  style={{
                    color: commissionType === 'FIXED' ? colors.onPrimary : colors.text,
                    fontWeight: '600',
                  }}
                >
                  {t('barber.commissionFixed')}
                </AppText>
              </TouchableOpacity>
            </View>
          </View>

          <TextField
            label={t('barber.commissionValue')}
            placeholder={commissionType === 'PERCENTAGE' ? '40' : '200'}
            keyboardType="numeric"
            value={commissionValue}
            onChangeText={setCommissionValue}
          />

          {error ? <AppText variant="error">{error}</AppText> : null}

          <View style={{ marginTop: 16 }}>
            <Button
              label={t('barber.sendInvite')}
              onPress={() => inviteMutation.mutate()}
              loading={inviteMutation.isPending}
            />
          </View>
        </View>
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: 16,
  },
  section: {
    gap: 6,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 8,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
