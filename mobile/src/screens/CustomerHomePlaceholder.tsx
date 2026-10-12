import { AppText } from '../components/AppText';
import { Button } from '../components/Button';
import { Screen } from '../components/Screen';
import { useT } from '../i18n';
import { logout } from '../api/auth';
import { useAuthStore } from '../store/authStore';

/** Placeholder only — the real customer app shell is Milestone 2. */
export function CustomerHomePlaceholder() {
  const t = useT();
  const user = useAuthStore((s) => s.user);
  const signOut = async () => {
    const token = useAuthStore.getState().refreshToken;
    if (token) await logout(token).catch(() => undefined);
    await useAuthStore.getState().signOut();
  };
  return (
    <Screen>
      <AppText variant="title">{t('home.welcome', { name: user?.name ?? '' })}</AppText>
      <AppText variant="caption">{t('home.placeholder', { salon: t('term.salon') })}</AppText>
      <Button variant="secondary" label={t('home.signOut')} onPress={signOut} />
    </Screen>
  );
}
