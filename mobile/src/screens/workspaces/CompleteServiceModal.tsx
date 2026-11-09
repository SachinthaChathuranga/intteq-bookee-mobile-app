import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { completeService } from '../../api/barber';
import { AppText } from '../../components/AppText';
import { useT } from '../../i18n';
import type { BarberStackParamList } from '../../navigation/types';
import { WorkspaceHeader } from '../../navigation/workspaces/WorkspaceHeader';
import { useTheme } from '../../theme/ThemeProvider';
import {
  Badge,
  Button,
  Card,
  Divider,
  Input,
  Screen,
  haptics,
  radius,
  spacing,
  useToast,
} from '../../ui';
import { formatCurrency } from '../../utils/format';

type Props = NativeStackScreenProps<BarberStackParamList, 'CompleteService'>;

const PAYMENT_METHODS: {
  key: 'CASH' | 'CARD' | 'TRANSFER';
  icon: keyof typeof Ionicons.glyphMap;
  labelKey: 'payment.cash' | 'payment.card' | 'payment.transfer';
}[] = [
  { key: 'CASH', icon: 'cash-outline', labelKey: 'payment.cash' },
  { key: 'CARD', icon: 'card-outline', labelKey: 'payment.card' },
  { key: 'TRANSFER', icon: 'swap-horizontal-outline', labelKey: 'payment.transfer' },
];

export function CompleteServiceModal({ route, navigation }: Props) {
  const { branchId, entry } = route.params;
  const t = useT();
  const { colors } = useTheme();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [amount, setAmount] = useState(String(entry.total_price || 0));
  const [method, setMethod] = useState<'CASH' | 'CARD' | 'TRANSFER'>('CASH');
  const [tip, setTip] = useState('0');
  const [error, setError] = useState<string | null>(null);

  const completeMutation = useMutation({
    mutationFn: async () => {
      const amtNum = parseFloat(amount);
      const tipNum = parseFloat(tip || '0');
      if (isNaN(amtNum) || amtNum < 0) {
        throw new Error('Valid amount is required');
      }
      return await completeService(branchId, entry.id, {
        amount: amtNum,
        payment_method: method,
        tip: isNaN(tipNum) ? 0 : tipNum,
      });
    },
    onSuccess: (data) => {
      haptics.success();
      queryClient.invalidateQueries({ queryKey: ['barber-queue', branchId] });
      queryClient.invalidateQueries({ queryKey: ['barber-shift', branchId] });
      showToast({
        title: t('common.done'),
        message: t('payment.commissionPreview', {
          amount: formatCurrency(data.commission_amount),
        }),
        tone: 'success',
      });
      navigation.goBack();
    },
    onError: (err: any) => {
      setError(err?.message || t('common.error.generic'));
    },
  });

  return (
    <View style={styles.flex}>
      <WorkspaceHeader title={t('payment.title')} onBack={() => navigation.goBack()} />
      <Screen scroll={false}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Customer & Services Summary */}
          <Card variant="elevated" padding="lg">
            <View style={styles.rowBetween}>
              <View style={{ flex: 1, gap: 2 }}>
                <AppText variant="heading2">
                  {entry.customer_name || entry.walk_in_name || 'Walk-in'}
                </AppText>
                <AppText variant="caption" style={{ color: colors.textSecondary }}>
                  {entry.services.map((s) => s.name).join(' • ')}
                </AppText>
              </View>
              {entry.token_number ? (
                <Badge label={`#${entry.token_number}`} tone="primary" />
              ) : null}
            </View>
            <Divider spacingVertical="md" />
            <View style={styles.rowBetween}>
              <AppText variant="caption">{t('booking.total')}</AppText>
              <AppText variant="numeric" style={{ color: colors.primary }}>
                {formatCurrency(parseFloat(amount) || 0)}
              </AppText>
            </View>
          </Card>

          <Input
            label={t('payment.amount')}
            keyboardType="numeric"
            value={amount}
            onChangeText={(txt) => {
              setAmount(txt);
              setError(null);
            }}
            leftIcon="pricetag-outline"
          />

          <View style={styles.section}>
            <AppText variant="label" style={{ color: colors.textSecondary }}>
              {t('payment.method')}
            </AppText>
            <View style={styles.methodGrid}>
              {PAYMENT_METHODS.map(({ key: m, icon, labelKey }) => {
                const selected = method === m;
                return (
                  <Pressable
                    key={m}
                    onPress={() => {
                      haptics.selection();
                      setMethod(m);
                    }}
                    style={[
                      styles.methodTile,
                      {
                        backgroundColor: selected
                          ? colors.primaryLight
                          : colors.surface,
                        borderColor: selected ? colors.primary : colors.border,
                        borderWidth: selected ? 1.5 : 1,
                      },
                    ]}
                  >
                    <Ionicons
                      name={icon}
                      size={22}
                      color={selected ? colors.primary : colors.textSecondary}
                    />
                    <AppText
                      variant="label"
                      style={{
                        color: selected ? colors.primary : colors.text,
                        fontWeight: selected ? '700' : '600',
                        textAlign: 'center',
                      }}
                    >
                      {t(labelKey)}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <Input
            label={t('payment.tip')}
            keyboardType="numeric"
            value={tip}
            onChangeText={setTip}
            leftIcon="heart-outline"
          />

          {error ? <AppText variant="error">{error}</AppText> : null}

          <View style={{ marginTop: spacing.sm }}>
            <Button
              label={t('payment.submit')}
              size="lg"
              leftIcon="checkmark-circle"
              onPress={() => completeMutation.mutate()}
              loading={completeMutation.isPending}
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
  scrollContent: {
    gap: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  section: {
    gap: spacing.sm,
  },
  methodGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  methodTile: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
});
