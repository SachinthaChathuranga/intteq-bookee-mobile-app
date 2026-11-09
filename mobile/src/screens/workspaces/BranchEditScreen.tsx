import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import {
  createBranch,
  fetchBranch,
  updateBranch,
  type WorkingHoursDay,
} from '../../api/owner';
import { AppText } from '../../components/AppText';
import { WorkingHoursEditor } from '../../components/WorkingHoursEditor';
import { useT } from '../../i18n';
import type { OwnerStackParamList } from '../../navigation/types';
import { WorkspaceHeader } from '../../navigation/workspaces/WorkspaceHeader';
import {
  Button,
  Card,
  Input,
  Screen,
  haptics,
  spacing,
  useToast,
} from '../../ui';

type Props = NativeStackScreenProps<OwnerStackParamList, 'BranchEdit'>;

export function BranchEditScreen({ route, navigation }: Props) {
  const t = useT();
  const { showToast } = useToast();
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
      setAddress(
        typeof b.address === 'string'
          ? b.address
          : (b.address as any)?.address || '',
      );
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
      }
      return await createBranch({
        name: name.trim(),
        address: address.trim(),
        phone: phone.trim(),
        working_hours: workingHours,
      });
    },
    onSuccess: () => {
      haptics.success();
      queryClient.invalidateQueries({ queryKey: ['branches'] });
      showToast({ title: t('branch.saved'), tone: 'success' });
      navigation.goBack();
    },
    onError: (err: any) => {
      setError(err?.message || t('common.error.generic'));
    },
  });

  return (
    <View style={styles.flex}>
      <WorkspaceHeader
        title={isEditing ? t('branch.editTitle') : t('branch.title')}
        onBack={() => navigation.goBack()}
      />
      <Screen scroll={false}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Card variant="elevated" padding="lg" style={styles.formCard}>
            <Input
              label={t('branch.name')}
              placeholder="e.g. Colombo Flagship"
              value={name}
              onChangeText={(txt) => {
                setName(txt);
                setError(null);
              }}
              leftIcon="business-outline"
            />

            <Input
              label={t('branch.address')}
              placeholder="e.g. 123 Galle Road, Colombo 03"
              value={address}
              onChangeText={setAddress}
              leftIcon="location-outline"
            />

            <Input
              label={t('branch.phone')}
              placeholder="e.g. 0112345678"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
              leftIcon="call-outline"
            />
          </Card>

          <WorkingHoursEditor value={workingHours} onChange={setWorkingHours} />

          {error ? <AppText variant="error">{error}</AppText> : null}

          <View style={styles.footer}>
            <Button
              label={t('branch.save')}
              size="lg"
              leftIcon="checkmark-circle"
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
  footer: {
    marginTop: spacing.xs,
  },
});
