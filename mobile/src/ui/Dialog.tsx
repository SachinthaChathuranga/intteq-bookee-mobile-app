import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '../components/AppText';
import { useTheme } from '../theme/ThemeProvider';
import { Button } from './Button';
import { getShadow, radius, spacing } from './tokens';

export interface ConfirmationDialogProps {
  visible: boolean;
  title: string;
  description?: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  tone?: 'danger' | 'primary' | 'warning';
  icon?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
}

export function ConfirmationDialog({
  visible,
  title,
  description,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  tone = 'primary',
  icon,
  loading = false,
}: ConfirmationDialogProps) {
  const { colors } = useTheme();

  const iconBg =
    tone === 'danger'
      ? colors.dangerLight
      : tone === 'warning'
        ? colors.warningLight
        : colors.primaryLight;

  const iconFg =
    tone === 'danger'
      ? colors.danger
      : tone === 'warning'
        ? colors.warning
        : colors.primary;

  const resolvedIcon: keyof typeof Ionicons.glyphMap =
    icon ??
    (tone === 'danger'
      ? 'alert-circle-outline'
      : tone === 'warning'
        ? 'warning-outline'
        : 'help-circle-outline');

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={[styles.backdrop, { backgroundColor: colors.overlay }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} />
        <View
          style={[
            styles.dialog,
            getShadow(colors, 'lg'),
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <View style={[styles.iconCircle, { backgroundColor: iconBg }]}>
            <Ionicons name={resolvedIcon} size={28} color={iconFg} />
          </View>
          <View style={styles.textBlock}>
            <AppText variant="heading2" style={styles.centerText}>
              {title}
            </AppText>
            {description ? (
              <AppText variant="bodySmall" style={[styles.centerText, { color: colors.textSecondary }]}>
                {description}
              </AppText>
            ) : null}
          </View>
          <View style={styles.actions}>
            <Button
              label={confirmLabel}
              variant={tone === 'danger' ? 'danger' : 'primary'}
              onPress={onConfirm}
              loading={loading}
            />
            <Button
              label={cancelLabel}
              variant="secondary"
              onPress={onCancel}
              disabled={loading}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  dialog: {
    width: '100%',
    maxWidth: 380,
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.lg,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textBlock: {
    alignItems: 'center',
    gap: spacing.xs + 2,
  },
  centerText: {
    textAlign: 'center',
  },
  actions: {
    width: '100%',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
});

