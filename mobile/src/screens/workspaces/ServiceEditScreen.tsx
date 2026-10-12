import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Switch, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { createService, fetchServices, updateService } from '../../api/owner';
import { AppText } from '../../components/AppText';
import { Button } from '../../components/Button';
import { Screen } from '../../components/Screen';
import { TextField } from '../../components/TextField';
import { useT } from '../../i18n';
import { WorkspaceHeader } from '../../navigation/workspaces/WorkspaceHeader';
import type { OwnerStackParamList } from '../../navigation/types';
import { useTheme } from '../../theme/ThemeProvider';

type Props = NativeStackScreenProps<OwnerStackParamList, 'ServiceEdit'>;

export function ServiceEditScreen({ route, navigation }: Props) {
  const t = useT();
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const { branchId, serviceId } = route.params;
  const isEditing = Boolean(serviceId);

  const [name, setName] = useState('');
  const [duration, setDuration] = useState('30');
  const [price, setPrice] = useState('1000');
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // If editing, find service in cached list or fetch
  const servicesQuery = useQuery({
    queryKey: ['services', branchId],
    queryFn: () => fetchServices(branchId),
    enabled: isEditing,
  });

  useEffect(() => {
    if (isEditing && servicesQuery.data) {
      const found = servicesQuery.data.find((s) => s.id === serviceId);
      if (found) {
        setName(found.name);
        setDuration(String(found.duration_minutes));
        setPrice(String(found.price));
        setIsActive(found.is_active);
      }
    }
  }, [isEditing, serviceId, servicesQuery.data]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const durNum = parseInt(duration, 10);
      const priceNum = parseFloat(price);

      if (!name.trim()) throw new Error(t('name.required'));
      if (isNaN(durNum) || durNum <= 0) throw new Error('Valid duration in minutes is required');
      if (isNaN(priceNum) || priceNum < 0) throw new Error('Valid price is required');

      if (isEditing && serviceId) {
        return await updateService(branchId, serviceId, {
          name: name.trim(),
          duration_minutes: durNum,
          price: priceNum,
          is_active: isActive,
        });
      } else {
        return await createService(branchId, {
          name: name.trim(),
          duration_minutes: durNum,
          price: priceNum,
          is_active: isActive,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services', branchId] });
      Alert.alert(t('common.done'), t('service.saved'));
      navigation.goBack();
    },
    onError: (err: any) => {
      setError(err?.message || t('common.error.generic'));
    },
  });

  return (
    <View style={{ flex: 1 }}>
      <WorkspaceHeader
        title={isEditing ? t('service.edit') : t('service.add')}
        onBack={() => navigation.goBack()}
      />
      <Screen>
        <View style={styles.form}>
          <TextField
            label={t('service.name')}
            placeholder="e.g. Classic Haircut"
            value={name}
            onChangeText={(txt) => {
              setName(txt);
              setError(null);
            }}
          />

          <TextField
            label={t('service.duration')}
            placeholder="30"
            keyboardType="number-pad"
            value={duration}
            onChangeText={setDuration}
          />

          <TextField
            label={t('service.price')}
            placeholder="1500"
            keyboardType="numeric"
            value={price}
            onChangeText={setPrice}
          />

          <View
            style={[
              styles.switchRow,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <AppText variant="body" style={{ fontWeight: '600' }}>
              {isActive ? t('service.active') : t('service.inactive')}
            </AppText>
            <Switch
              value={isActive}
              onValueChange={setIsActive}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.surface}
            />
          </View>

          {error ? <AppText variant="error">{error}</AppText> : null}

          <View style={{ marginTop: 16 }}>
            <Button
              label={t('service.save')}
              onPress={() => saveMutation.mutate()}
              loading={saveMutation.isPending}
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
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
});
