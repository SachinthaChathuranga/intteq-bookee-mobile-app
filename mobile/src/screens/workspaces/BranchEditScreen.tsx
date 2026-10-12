import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { createBranch, fetchBranch, updateBranch, type WorkingHoursDay } from '../../api/owner';
import { AppText } from '../../components/AppText';
import { Button } from '../../components/Button';
import { Screen } from '../../components/Screen';
import { TextField } from '../../components/TextField';
import { WorkingHoursEditor } from '../../components/WorkingHoursEditor';
import { useT } from '../../i18n';
import { WorkspaceHeader } from '../../navigation/workspaces/WorkspaceHeader';
import type { OwnerStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<OwnerStackParamList, 'BranchEdit'>;

export function BranchEditScreen({ route, navigation }: Props) {
  const t = useT();
  const queryClient = useQueryClient();
  const branchId = route.params?.branchId;
  const isEditing = Boolean(branchId);

  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [workingHours, setWorkingHours] = useState<WorkingHoursDay[]>([]);
  const [error, setError] = useState<string | null>(null);

  const branchQuery = useQuery({
    queryKey: ['branch', branchId],
    queryFn: () => fetchBranch(branchId!),
    enabled: isEditing,
  });

  useEffect(() => {
    if (branchQuery.data) {
      const b = branchQuery.data;
      setName(b.name || '');
      setAddress(typeof b.address === 'string' ? b.address : (b.address as any)?.address || '');
      setPhone(b.phone || '');
      if (b.working_hours && b.working_hours.length > 0) {
        setWorkingHours(b.working_hours);
      }
    }
  }, [branchQuery.data]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!name.trim()) {
        throw new Error(t('name.required'));
      }
      if (isEditing && branchId) {
        return await updateBranch(branchId, {
          name: name.trim(),
          address: address.trim(),
          phone: phone.trim(),
          working_hours: workingHours,
        });
      } else {
        return await createBranch({
          name: name.trim(),
          address: address.trim(),
          phone: phone.trim(),
          working_hours: workingHours,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] });
      Alert.alert(t('common.done'), t('branch.saved'));
      navigation.goBack();
    },
    onError: (err: any) => {
      setError(err?.message || t('common.error.generic'));
    },
  });

  return (
    <View style={{ flex: 1 }}>
      <WorkspaceHeader title={isEditing ? t('branch.editTitle') : t('branch.title')} onBack={() => navigation.goBack()} />
      <Screen>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <TextField
            label={t('branch.name')}
            placeholder="e.g. Colombo Flagship"
            value={name}
            onChangeText={(txt) => {
              setName(txt);
              setError(null);
            }}
          />

          <TextField
            label={t('branch.address')}
            placeholder="e.g. 123 Galle Road, Colombo 03"
            value={address}
            onChangeText={setAddress}
          />

          <TextField
            label={t('branch.phone')}
            placeholder="e.g. 0112345678"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
          />

          <WorkingHoursEditor value={workingHours} onChange={setWorkingHours} />

          {error ? <AppText variant="error">{error}</AppText> : null}

          <View style={{ marginTop: 12, marginBottom: 24 }}>
            <Button
              label={t('branch.save')}
              onPress={() => saveMutation.mutate()}
              loading={saveMutation.isPending}
            />
          </View>
        </ScrollView>
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    gap: 16,
    paddingBottom: 40,
  },
});
