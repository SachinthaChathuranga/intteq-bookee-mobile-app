import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Switch, View } from 'react-native';
import { createService, fetchServices, updateService } from '../../api/owner';
import { AppText } from '../../components/AppText';
import { useT } from '../../i18n';
import type { OwnerStackParamList } from '../../navigation/types';
import { WorkspaceHeader } from '../../navigation/workspaces/WorkspaceHeader';
import { useTheme } from '../../theme/ThemeProvider';
import {
  Button,
  Card,
  Input,
  Screen,
  haptics,
  radius,
  spacing,
  useToast,
} from '../../ui';

type Props = NativeStackScreenProps<OwnerStackParamList, 'ServiceEdit'>;

export function ServiceEditScreen({ route, navigation }: Props) {
  const t = useT();
  const { colors } = useTheme();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const { branchId, serviceId } = route.params;
  const isEditing = Boolean(serviceId);

  const [name, setName] = useState('');
  const [duration, setDuration] = useState('30');
  const [price, setPrice] = useState('1000');
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      if (isNaN(durNum) || durNum <= 0)
        throw new Error('Valid duration in minutes is required');
      if (isNaN(priceNum) || priceNum < 0)
        throw new Error('Valid price is required');

      if (isEditing && serviceId) {
        return await updateService(branchId, serviceId, {
          name: name.trim(),
          duration_minutes: durNum,
          price: priceNum,
          is_active: isActive,
        });
      }
      return await createService(branchId, {
        name: name.trim(),
        duration_minutes: durNum,
        price: priceNum,
        is_active: isActive,
      });
    },
    onSuccess: () => {
      haptics.success();
      queryClient.invalidateQueries({ queryKey: ['services', branchId] });
      showToast({ title: t('service.saved'), tone: 'success' });
      navigation.goBack();
    },
    onError: (err: any) => {
      setError(err?.message || t('common.error.generic'));
    },
  });

  return (
    <View style={styles.flex}>
      <WorkspaceHeader
        title={isEditing ? t('service.edit') : t('service.add')}
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
              label={t('service.name')}
              placeholder="e.g. Classic Haircut"
              value={name}
              onChangeText={(txt) => {
                setName(txt);
                setError(null);
              }}
              leftIcon="cut-outline"
            />

            <Input
              label={t('service.duration')}
              placeholder="30"
              keyboardType="number-pad"
              value={duration}
              onChangeText={setDuration}
              leftIcon="time-outline"
            />

            <Input
              label={t('service.price')}
              placeholder="1500"
              keyboardType="numeric"
              value={price}
              onChangeText={setPrice}
              leftIcon="pricetag-outline"
            />

            <View
              style={[
                styles.switchRow,
                {
                  backgroundColor: colors.inputBackground,
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={{ gap: 2 }}>
                <AppText variant="bodyBold">
                  {isActive ? t('service.active') : t('service.inactive')}
                </AppText>
                <AppText variant="caption">{t('common.status')}</AppText>
              </View>
              <Switch
                value={isActive}
                onValueChange={setIsActive}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.onPrimary}
              />
            </View>
          </Card>

          {error ? <AppText variant="error">{error}</AppText> : null}

          <Button
            label={t('service.save')}
            size="lg"
            leftIcon="checkmark-circle"
            onPress={() => saveMutation.mutate()}
            loading={saveMutation.isPending}
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
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
  },
});
