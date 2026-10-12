import { AppText } from '../../components/AppText';
import { Card } from '../../components/Card';
import { Screen } from '../../components/Screen';
import { useT } from '../../i18n';

export function AppointmentsScreen() {
  const t = useT();

  return (
    <Screen>
      <AppText variant="title">{t('appointments.title')}</AppText>
      <Card>
        <AppText variant="caption">{t('appointments.placeholder')}</AppText>
      </Card>
    </Screen>
  );
}
