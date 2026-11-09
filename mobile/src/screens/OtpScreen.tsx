import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { fetchMe, requestOtp, updateMe, verifyOtp } from '../api/auth';
import { ApiError } from '../api/client';
import { AppText } from '../components/AppText';
import { Button } from '../components/Button';
import { Screen } from '../components/Screen';
import { useT } from '../i18n';
import type { RootStackParamList } from '../navigation/types';
import { useAuthStore } from '../store/authStore';
import { useSettingsStore } from '../store/settingsStore';
import { useTheme } from '../theme/ThemeProvider';
import { Badge } from '../ui/Badge';
import { IconButton } from '../ui/Button';
import { radius, spacing } from '../ui/tokens';

type Props = NativeStackScreenProps<RootStackParamList, 'Otp'>;

const RESEND_SECONDS = 60;

export function OtpScreen({ route, navigation }: Props) {
  const { phone } = route.params;
  const t = useT();
  const { colors } = useTheme();
  const setSession = useAuthStore((s) => s.setSession);
  const language = useSettingsStore((s) => s.language) ?? 'en';
  const theme = useSettingsStore((s) => s.theme);

  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(RESEND_SECONDS);
  const inputRef = useRef<any>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleVerify = async () => {
    setError(null);
    const trimmed = code.replace(/\D/g, '');
    if (trimmed.length !== 6) {
      setError(t('otp.invalid'));
      return;
    }
    setLoading(true);
    try {
      const session = await verifyOtp(phone, trimmed);
      await setSession({
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
        user: session.user,
      });
      try {
        const [{ user }, me] = await Promise.all([
          updateMe({ language, theme }),
          fetchMe(),
        ]);
        await setSession({
          accessToken: session.accessToken,
          refreshToken: session.refreshToken,
          user,
          roles: me.roles,
        });
      } catch {
        // non-fatal
      }
    } catch (err) {
      if (err instanceof ApiError && err.code === 'OTP_INVALID') {
        setError(t('otp.invalid'));
      } else {
        setError(t('common.error.generic'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    setError(null);
    try {
      await requestOtp(phone);
      setCooldown(RESEND_SECONDS);
    } catch (err) {
      if (err instanceof ApiError && err.code === 'OTP_COOLDOWN') {
        setError(t('otp.cooldown'));
      } else {
        setError(t('common.error.network'));
      }
    }
  };

  const digits = code.replace(/\D/g, '').slice(0, 6);

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
              <IconButton
                icon="arrow-back"
                onPress={() => navigation.goBack()}
                variant="surface"
                accessibilityLabel={t('common.back')}
              />
            </View>

            <View style={styles.headerBlock}>
              <Badge label={t('otp.stepTag')} tone="primary" size="sm" />
              <AppText variant="largeHeading">{t('otp.title')}</AppText>
              <AppText variant="body" style={{ color: colors.textSecondary }}>
                {t('otp.subtitle', { phone })}
              </AppText>
            </View>

            <View style={styles.otpSection}>
              <AppText variant="label" style={{ color: colors.textSecondary }}>
                {t('otp.codeLabel')}
              </AppText>

              <Pressable
                onPress={() => inputRef.current?.focus()}
                style={styles.otpBoxesRow}
                accessibilityRole="button"
                accessibilityLabel={t('otp.codeLabel')}
              >
                {[0, 1, 2, 3, 4, 5].map((index) => {
                  const char = digits[index] ?? '';
                  const isCurrent = index === digits.length || (digits.length === 6 && index === 5);
                  const isFilled = Boolean(char);

                  return (
                    <View
                      key={index}
                      style={[
                        styles.otpBox,
                        {
                          backgroundColor: isFilled ? colors.primaryLight : colors.surface,
                          borderColor: error
                            ? colors.danger
                            : isCurrent
                              ? colors.primary
                              : isFilled
                                ? colors.primaryBorder
                                : colors.border,
                          borderWidth: isCurrent || error ? 2 : 1,
                        },
                      ]}
                    >
                      <AppText
                        variant="heading1"
                        style={{
                          color: isFilled ? colors.primary : colors.placeholder,
                        }}
                      >
                        {char || '•'}
                      </AppText>
                    </View>
                  );
                })}
              </Pressable>

              <TextInput
                ref={inputRef}
                value={digits}
                onChangeText={(v) => {
                  const clean = v.replace(/\D/g, '').slice(0, 6);
                  setCode(clean);
                  if (error) setError(null);
                }}
                keyboardType="number-pad"
                maxLength={6}
                autoFocus
                textContentType="oneTimeCode"
                autoComplete="sms-otp"
                style={styles.hiddenInput}
              />

              {error ? (
                <View style={styles.errorRow}>
                  <Ionicons name="alert-circle" size={16} color={colors.danger} />
                  <AppText variant="error">{error}</AppText>
                </View>
              ) : null}
            </View>

            <View style={styles.resendRow}>
              <Pressable
                disabled={cooldown > 0}
                onPress={handleResend}
                style={[
                  styles.resendPill,
                  {
                    backgroundColor: cooldown > 0 ? colors.inputBackground : colors.primaryLight,
                    borderColor: cooldown > 0 ? colors.border : colors.primaryBorder,
                  },
                ]}
              >
                <Ionicons
                  name="refresh-outline"
                  size={15}
                  color={cooldown > 0 ? colors.textMuted : colors.primary}
                />
                <AppText
                  variant="label"
                  style={{
                    color: cooldown > 0 ? colors.textMuted : colors.primary,
                  }}
                >
                  {cooldown > 0
                    ? t('otp.resendIn', { seconds: cooldown })
                    : t('otp.resend')}
                </AppText>
              </Pressable>
            </View>
          </View>

          <View style={styles.footer}>
            <Button
              label={t('otp.verify')}
              onPress={handleVerify}
              loading={loading}
              disabled={digits.length < 6}
            />
            <Button
              variant="ghost"
              label={t('otp.changeNumber')}
              onPress={() => navigation.goBack()}
            />
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
  },
  headerBlock: {
    gap: spacing.sm,
  },
  otpSection: {
    gap: spacing.sm + 2,
  },
  otpBoxesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  otpBox: {
    flex: 1,
    height: 58,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hiddenInput: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  resendRow: {
    alignItems: 'flex-start',
  },
  resendPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  footer: {
    gap: spacing.sm,
    paddingTop: spacing.xl,
  },
});
