import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { requestOtp } from '../api/auth';
import { errorKey } from '../api/errors';
import { AppText } from '../components/AppText';
import { Button } from '../components/Button';
import { Screen } from '../components/Screen';
import { TextField } from '../components/TextField';
import { APP_NAME } from '../config/app';
import { useT } from '../i18n';
import type { RootStackParamList } from '../navigation/types';
import { isValidSlMobile } from '../utils/phone';

type Props = NativeStackScreenProps<RootStackParamList, 'PhoneLogin'>;

export function PhoneLoginScreen({ navigation }: Props) {
  const t = useT();
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);

  const send = useMutation({
    mutationFn: () => requestOtp(phone),
    onSuccess: () => navigation.navigate('Otp', { phone }),
    onError: (err) => setError(t(errorKey(err))),
  });

  const submit = () => {
    if (!isValidSlMobile(phone)) return setError(t('login.invalidPhone'));
    setError(null);
    send.mutate();
  };

  return (
    <Screen>
      <AppText variant="title">{t('login.title', { appName: APP_NAME })}</AppText>
      <AppText variant="caption">{t('login.subtitle')}</AppText>
      <TextField
        label={t('login.phoneLabel')}
        placeholder={t('login.phonePlaceholder')}
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        autoComplete="tel"
        error={error}
      />
      <Button label={t('login.sendCode')} onPress={submit} loading={send.isPending} />
    </Screen>
  );
}
