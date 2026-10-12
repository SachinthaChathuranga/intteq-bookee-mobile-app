import { useEffect, useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import type { CompleteServiceInput, QueueEntry } from '../../api/barber';
import { AppText } from '../../components/AppText';
import { BottomSheet, Button, Input } from '../../ui';
import { useT } from '../../i18n';
import { useTheme } from '../../theme/ThemeProvider';

interface Props {
  visible: boolean;
  entry: QueueEntry | null;
  onClose: () => void;
  onSubmit: (data: CompleteServiceInput) => void;
  loading?: boolean;
}

export function CompleteServiceModal({ visible, entry, onClose, onSubmit, loading }: Props) {
  const t = useT();
  const { colors } = useTheme();

  const [amount, setAmount] = useState('1000');
  const [tip, setTip] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD' | 'TRANSFER'>('CASH');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (entry) {
      setAmount(String(entry.total_price || 1000));
      setTip('');
      setPaymentMethod('CASH');
      setError(null);
    }
  }, [entry]);

  const handleSubmit = () => {
    const numAmount = parseFloat(amount);
    const numTip = tip.trim() ? parseFloat(tip) : 0;

    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Valid amount is required');
      return;
    }
    if (isNaN(numTip) || numTip < 0) {
      setError('Valid tip amount is required');
      return;
    }

    onSubmit({
      amount: numAmount,
      payment_method: paymentMethod,
      tip: numTip > 0 ? numTip : undefined,
    });
  };

  if (!entry) return null;

  const customerName = entry.walk_in_name || entry.customer_name || entry.token_number || 'Customer';

  return (
    <BottomSheet visible={visible} onClose={onClose} title={t('payment.title')}>
      <View style={styles.sheetContent}>
        <AppText variant="body" style={{ fontWeight: '700', fontSize: 16 }}>
          {customerName}
        </AppText>

        <Input
          label={t('payment.amount')}
          keyboardType="numeric"
          value={amount}
          onChangeText={(txt) => {
            setAmount(txt);
            setError(null);
          }}
        />

        <View style={styles.section}>
          <AppText variant="caption" style={{ color: colors.textMuted, fontWeight: '600' }}>
            {t('payment.method')}
          </AppText>
          <View style={styles.methodRow}>
            {(['CASH', 'CARD', 'TRANSFER'] as const).map((method) => {
              const isSelected = paymentMethod === method;
              const label =
                method === 'CASH'
                  ? t('payment.cash')
                  : method === 'CARD'
                  ? t('payment.card')
                  : t('payment.transfer');

              return (
                <TouchableOpacity
                  key={method}
                  onPress={() => setPaymentMethod(method)}
                  activeOpacity={0.7}
                  style={[
                    styles.methodBtn,
                    {
                      backgroundColor: isSelected ? colors.primary : colors.background,
                      borderColor: isSelected ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <AppText
                    variant="caption"
                    style={{
                      color: isSelected ? colors.onPrimary : colors.text,
                      fontWeight: '700',
                    }}
                  >
                    {label}
                  </AppText>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <Input
          label={t('payment.tip')}
          placeholder="0"
          keyboardType="numeric"
          value={tip}
          onChangeText={setTip}
        />

        {error ? <AppText variant="error">{error}</AppText> : null}

        <View style={styles.buttonRow}>
          <View style={{ flex: 1 }}>
            <Button variant="secondary" label={t('common.cancel')} onPress={onClose} disabled={loading} />
          </View>
          <View style={{ flex: 1 }}>
            <Button variant="primary" label={t('payment.submit')} onPress={handleSubmit} loading={loading} />
          </View>
        </View>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  sheetContent: {
    gap: 16,
    paddingBottom: 8,
  },
  section: {
    gap: 8,
  },
  methodRow: {
    flexDirection: 'row',
    gap: 8,
  },
  methodBtn: {
    flex: 1,
    minHeight: 44,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
});

