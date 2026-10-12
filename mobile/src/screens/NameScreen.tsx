import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { updateMe } from '../api/auth';
import { errorKey } from '../api/errors';
import { AppText } from '../components/AppText';
import { Button } from '../components/Button';
import { Screen } from '../components/Screen';
import { TextField } from '../components/TextField';
import { useT } from '../i18n';
import { useAuthStore } from '../store/authStore';

export function NameScreen() {
  const t = useT();
  const setUser = useAuthStore((s) => s.setUser);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: () => updateMe({ name: name.trim() }),
    onSuccess: ({ user }) => setUser(user),
    onError: (err) => setError(t(errorKey(err))),
  });

  return (
    <Screen>
      <AppText variant="title">{t('name.title')}</AppText>
      <AppText variant="caption">{t('name.subtitle')}</AppText>
      <TextField
        label={t('name.label')}
        placeholder={t('name.placeholder')}
        value={name}
        onChangeText={setName}
        autoCapitalize="words"
        autoComplete="name"
        error={error}
      />
      <Button
        label={t('common.continue')}
        onPress={() => {
          setError(null);
          save.mutate();
        }}
        loading={save.isPending}
        disabled={name.trim().length === 0}
      />
    </Screen>
  );
}
