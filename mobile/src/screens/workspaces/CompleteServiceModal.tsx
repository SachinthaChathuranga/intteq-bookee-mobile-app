import { useEffect, useState } from 'react';
import { Modal, StyleSheet, TouchableOpacity, View } from 'react-native';
import type { CompleteServiceInput, QueueEntry } from '../../api/barber';
import { AppText } from '../../components/AppText';
import { Button } from '../../components/Button';
import { TextField } from '../../components/TextField';
import { useT } from '../../i18n';
import { useTheme } from '../../theme/ThemeProvider';
import { formatCurrency } from '../../utils/format';

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

  if (!visible || !entry) return null;

  const customerName = entry.walk_in_name || entry.customer_name || entry.token_number || 'Customer';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={[styles.backdrop, { backgroundColor: colors.overlay }]}>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <AppText variant="title" style={{ fontSize: 20 }}>
            {t('payment.title')}
          </AppText>
          <AppText variant="body" style={{ fontWeight: '600' }}>
            {customerName}
          </AppText>

          <TextField
            label={t('payment.amount')}
            keyboardType="numeric"
            value={amount}
            onChangeText={(txt) => {
              setAmount(txt);
              setError(null);
            }}
          />

          <View style={styles.section}>
            <AppText variant="caption">{t('payment.method')}</AppText>
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
                    style={[
                      styles.methodBtn,
                      {
                        backgroundColor: isSelected ? colors.primary : colors.background,
                        borderColor: colors.border,
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

          <TextField
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
              <Button label={t('payment.submit')} onPress={handleSubmit} loading={loading} />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    gap: 16,
  },
  section: {
    gap: 6,
  },
  methodRow: {
    flexDirection: 'row',
    gap: 8,
  },
  methodBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
});
