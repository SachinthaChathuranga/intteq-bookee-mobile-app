import { StyleSheet, View } from 'react-native';
import { AppText } from '../../components/AppText';
import { BottomSheet, Button } from '../../ui';
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
    <BottomSheet visible={visible} onClose={onDismiss} title={t('walkin.tokenGenerated')}>
      <View style={styles.sheetContent}>
        <View style={[styles.tokenBadge, { backgroundColor: colors.background, borderColor: colors.primary }]}>
          <AppText style={[styles.tokenText, { color: colors.primary }]}>{token}</AppText>
        </View>

        {customerName ? (
          <AppText variant="body" style={{ textAlign: 'center', fontWeight: '700', fontSize: 16 }}>
            {customerName}
          </AppText>
        ) : null}

        <View style={[styles.waitInfo, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <AppText variant="caption" style={{ color: colors.textMuted }}>
            {t('walkin.estWait', { time: `${estimatedWaitMinutes} mins` })}
          </AppText>
        </View>

        <View style={styles.buttonWrapper}>
          <Button variant="primary" label={t('common.done')} onPress={onDismiss} />
        </View>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  sheetContent: {
    alignItems: 'center',
    gap: 12,
    paddingBottom: 16,
  },
  tokenBadge: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 20,
    borderWidth: 2,
    marginVertical: 8,
  },
  tokenText: {
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: 2,
  },
  waitInfo: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  buttonWrapper: {
    width: '100%',
    marginTop: 12,
  },
});

