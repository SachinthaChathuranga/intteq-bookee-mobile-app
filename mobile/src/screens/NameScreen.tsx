import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { updateMe } from '../api/auth';
import { AppText } from '../components/AppText';
import { Button } from '../components/Button';
import { Screen } from '../components/Screen';
import { TextField } from '../components/TextField';
import { useT } from '../i18n';
import { useAuthStore } from '../store/authStore';
import { useTheme } from '../theme/ThemeProvider';
import { Avatar } from '../ui/Avatar';
import { Badge } from '../ui/Badge';
import { spacing } from '../ui/tokens';

export function NameScreen() {
  const t = useT();
  const { colors } = useTheme();
  const setUser = useAuthStore((s) => s.setUser);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setError(null);
    const trimmed = name.trim();
    if (!trimmed) {
      setError(t('name.required'));
      return;
    }
    setLoading(true);
    try {
      const { user } = await updateMe({ name: trimmed });
      await setUser(user);
    } catch {
      setError(t('common.error.generic'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen scroll={false}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.topSection}>
            <View style={styles.avatarPreviewRow}>
              <Avatar name={name.trim() || 'B'} size="xl" status="online" />
            </View>

            <View style={styles.headerBlock}>
              <Badge label={t('name.stepTag')} tone="primary" size="sm" />
              <AppText variant="largeHeading">{t('name.title')}</AppText>
              <AppText variant="body" style={{ color: colors.textSecondary }}>
                {t('name.subtitle')}
              </AppText>
            </View>

            <TextField
              label={t('name.label')}
              placeholder={t('name.placeholder')}
              autoFocus
              autoComplete="name"
              value={name}
              onChangeText={(v) => {
                setName(v);
                if (error) setError(null);
              }}
              error={error}
              leftIcon={<Ionicons name="person-outline" size={18} color={colors.textMuted} />}
            />
          </View>

          <View style={styles.footer}>
            <Button label={t('common.continue')} onPress={handleSave} loading={loading} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
  },
  topSection: {
    gap: spacing.xl,
  },
  avatarPreviewRow: {
    alignItems: 'flex-start',
    marginTop: spacing.sm,
  },
  headerBlock: {
    gap: spacing.sm,
  },
  footer: {
    paddingTop: spacing.xl,
  },
});
