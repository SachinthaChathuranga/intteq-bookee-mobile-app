import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { requestOtp } from '../api/auth';
import { errorKey } from '../api/errors';
import { AppText } from '../components/AppText';
import { Button } from '../components/Button';
import { Screen } from '../components/Screen';
import { TextField } from '../components/TextField';
import { appConfig } from '../config/app';
import { useT } from '../i18n';
import type { RootStackParamList } from '../navigation/types';
import { useTheme } from '../theme/ThemeProvider';
import { Badge } from '../ui/Badge';
import { IconButton } from '../ui/Button';
import { radius, spacing } from '../ui/tokens';

type Props = NativeStackScreenProps<RootStackParamList, 'PhoneLogin'>;

function isLikelyLkPhone(raw: string): boolean {
  const digits = raw.replace(/\D/g, '');
  return (
    (digits.length === 10 && digits.startsWith('07')) ||
    (digits.length === 9 && digits.startsWith('7')) ||
    (digits.length === 11 && digits.startsWith('947'))
  );
}

export function PhoneLoginScreen({ navigation }: Props) {
  const t = useT();
  const { colors } = useTheme();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);
    if (!isLikelyLkPhone(phone)) {
      setError(t('login.invalidPhone'));
      return;
    }
    setLoading(true);
    try {
      await requestOtp(phone.trim());
      navigation.navigate('Otp', { phone: phone.trim() });
    } catch (err) {
      setError(t(errorKey(err)));
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
            <View style={styles.topBar}>
              <View style={styles.brandRow}>
                <View style={[styles.brandIcon, { backgroundColor: colors.primary }]}>
                  <Ionicons name="cut" size={20} color={colors.onPrimary} />
                </View>
                <AppText variant="heading3">{appConfig.name}</AppText>
              </View>
              <IconButton
                icon="language-outline"
                size="sm"
                variant="surface"
                accessibilityLabel={t('profile.language')}
                onPress={() => navigation.navigate('LanguageSelect')}
              />
            </View>

            <View style={styles.headerBlock}>
              <Badge label={t('login.stepTag')} tone="primary" size="sm" />
              <AppText variant="largeHeading">
                {t('login.title', { appName: appConfig.name })}
              </AppText>
              <AppText variant="body" style={{ color: colors.textSecondary }}>
                {t('login.subtitle')}
              </AppText>
            </View>

            <View style={styles.formCard}>
              <TextField
                label={t('login.phoneLabel')}
                placeholder={t('login.phonePlaceholder')}
                keyboardType="phone-pad"
                autoComplete="tel"
                value={phone}
                onChangeText={(v) => {
                  setPhone(v);
                  if (error) setError(null);
                }}
                error={error}
                leftIcon={
                  <View
                    style={[
                      styles.countryPill,
                      { backgroundColor: colors.surface, borderColor: colors.border },
                    ]}
                  >
                    <Ionicons name="call-outline" size={14} color={colors.primary} />
                    <AppText variant="label" style={{ color: colors.text }}>
                      +94
                    </AppText>
                  </View>
                }
              />

              <View
                style={[
                  styles.securityHint,
                  { backgroundColor: colors.primaryLight, borderColor: colors.primaryBorder },
                ]}
              >
                <Ionicons name="shield-checkmark-outline" size={18} color={colors.primary} />
                <AppText variant="caption" style={{ color: colors.textSecondary, flex: 1 }}>
                  {t('login.secureNote')}
                </AppText>
              </View>
            </View>
          </View>

          <View style={styles.footer}>
            <Button label={t('login.sendCode')} onPress={handleSubmit} loading={loading} />
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
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  brandIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.sm + 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBlock: {
    gap: spacing.sm,
  },
  formCard: {
    gap: spacing.md,
  },
  countryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.xs,
    borderWidth: 1,
  },
  securityHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  footer: {
    paddingTop: spacing.xl,
  },
});
