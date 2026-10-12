import { View } from 'react-native';
import { AppText } from '../../components/AppText';
import { Card } from '../../components/Card';
import { Screen } from '../../components/Screen';
import { useT } from '../../i18n';
import { useAuthStore } from '../../store/authStore';

export function HomeScreen() {
  const t = useT();
  const user = useAuthStore((s) => s.user);

  return (
    <Screen>
      <AppText variant="title">{t('home.welcome', { name: user?.name ?? '' })}</AppText>
      <Card>
        <AppText variant="body" style={{ fontWeight: '600' }}>
          {t('term.salon')}
        </AppText>
        <AppText variant="caption">
          {t('home.placeholder', { salon: t('term.salon') })}
        </AppText>
      </Card>
    </Screen>
  );
}
