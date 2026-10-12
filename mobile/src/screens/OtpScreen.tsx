import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMutation } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { requestOtp, updateMe, verifyOtp } from '../api/auth';
import { errorKey } from '../api/errors';
import { AppText } from '../components/AppText';
import { Button } from '../components/Button';
import { Screen } from '../components/Screen';
import { TextField } from '../components/TextField';
import { useT } from '../i18n';
import type { RootStackParamList } from '../navigation/types';
import { useAuthStore } from '../store/authStore';
import { useSettingsStore } from '../store/settingsStore';

type Props = NativeStackScreenProps<RootStackParamList, 'Otp'>;

const RESEND_SECONDS = 60;

export function OtpScreen({ route, navigation }: Props) {
  const { phone } = route.params;
  const t = useT();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const id = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [secondsLeft]);

  const verify = useMutation({
    mutationFn: () => verifyOtp(phone, code),
    onSuccess: async (session) => {
      const settings = useSettingsStore.getState();
      await useAuthStore.getState().setSession(session);
      if (session.isNewUser) {
        // New account: the choices made on this device become the account's preferences.
        const { user } = await updateMe({ language: settings.language ?? session.user.language, theme: settings.theme });
        useAuthStore.getState().setUser(user);
      } else {
        // Returning user: adopt the saved account preferences.
        settings.setLanguage(session.user.language);
        settings.setTheme(session.user.theme);
      }
    },
    onError: (err) => setError(t(errorKey(err))),
  });

  const resend = useMutation({
    mutationFn: () => requestOtp(phone),
    onSuccess: () => setSecondsLeft(RESEND_SECONDS),
    onError: (err) => setError(t(errorKey(err))),
  });

  return (
    <Screen>
      <AppText variant="title">{t('otp.title')}</AppText>
      <AppText variant="caption">{t('otp.subtitle', { phone })}</AppText>
      <TextField
        label={t('otp.codeLabel')}
        value={code}
        onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))}
        keyboardType="number-pad"
        autoComplete="one-time-code"
        textContentType="oneTimeCode"
        maxLength={6}
        error={error}
      />
      <Button
        label={t('otp.verify')}
        onPress={() => {
          setError(null);
          verify.mutate();
        }}
        loading={verify.isPending}
        disabled={code.length !== 6}
      />
      <Button
        variant="secondary"
        label={secondsLeft > 0 ? t('otp.resendIn', { seconds: secondsLeft }) : t('otp.resend')}
        onPress={() => {
          setError(null);
          resend.mutate();
        }}
        loading={resend.isPending}
        disabled={secondsLeft > 0}
      />
      <Button variant="secondary" label={t('otp.changeNumber')} onPress={() => navigation.goBack()} />
    </Screen>
  );
}
