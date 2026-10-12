import { Modal, StyleSheet, View } from 'react-native';
import { AppText } from '../../components/AppText';
import { Button } from '../../components/Button';
import { useT } from '../../i18n';
import { useTheme } from '../../theme/ThemeProvider';

interface Props {
  visible: boolean;
  token: string;
  customerName?: string | null;
  estimatedWaitMinutes: number;
  onDismiss: () => void;
}

export function WalkInSuccessModal({
  visible,
  token,
  customerName,
  estimatedWaitMinutes,
  onDismiss,
}: Props) {
  const t = useT();
  const { colors } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={[styles.backdrop, { backgroundColor: colors.overlay }]}>
        <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <AppText variant="title" style={{ textAlign: 'center', marginBottom: 8 }}>
            {t('walkin.tokenGenerated')}
          </AppText>

          <View style={[styles.tokenBadge, { backgroundColor: colors.background, borderColor: colors.primary }]}>
            <AppText style={[styles.tokenText, { color: colors.primary }]}>{token}</AppText>
          </View>

          {customerName ? (
            <AppText variant="body" style={{ textAlign: 'center', fontWeight: '600', marginTop: 12 }}>
              {customerName}
            </AppText>
          ) : null}

          <View style={[styles.waitInfo, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <AppText variant="caption" style={{ color: colors.textMuted }}>
              {t('walkin.estWait', { time: `${estimatedWaitMinutes} mins` })}
            </AppText>
          </View>

          <View style={{ marginTop: 20 }}>
            <Button variant="primary" label={t('common.done')} onPress={onDismiss} />
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
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
  },
  tokenBadge: {
    alignSelf: 'center',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 2,
    marginVertical: 12,
  },
  tokenText: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: 2,
  },
  waitInfo: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    marginTop: 8,
  },
});
