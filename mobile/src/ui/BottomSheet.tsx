import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeProvider';
import { lightImpact } from './haptics';
import { radius, spacing, typography } from './tokens';

interface Props {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  maxHeight?: number;
}

export function BottomSheet({ visible, onClose, title, children, maxHeight }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const handleClose = () => {
    lightImpact();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        {/* Backdrop */}
        <Pressable
          accessibilityRole="button"
          onPress={handleClose}
          style={[styles.backdrop, { backgroundColor: colors.overlay }]}
        />

        {/* Slide-up Sheet */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardWrap}
        >
          <View
            style={[
              styles.sheet,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                paddingBottom: insets.bottom + spacing.md,
                maxHeight: maxHeight ?? '85%',
              },
            ]}
          >
            {/* Drag Handle */}
            <View style={styles.handleContainer}>
              <View style={[styles.dragHandle, { backgroundColor: colors.border }]} />
            </View>

            {/* Header */}
            {title ? (
              <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <Text style={[typography.heading, { color: colors.text }]}>{title}</Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={handleClose}
                  style={styles.closeBtn}
                >
                  <Text style={{ color: colors.textMuted, fontSize: 18 }}>✕</Text>
                </Pressable>
              </View>
            ) : null}

            {/* Sheet Content */}
            <ScrollView
              contentContainerStyle={styles.content}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {children}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  keyboardWrap: {
    width: '100%',
    justifyContent: 'flex-end',
  },
  sheet: {
    width: '100%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  dragHandle: {
    width: 36,
    height: 5,
    borderRadius: radius.full,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
  },
  closeBtn: {
    padding: spacing.xs,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.md,
  },
});
