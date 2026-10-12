import { AppText } from '../../components/AppText';
import { Card } from '../../components/Card';
import { Screen } from '../../components/Screen';
import { useT } from '../../i18n';

export function ExploreScreen() {
  const t = useT();

  return (
    <Screen>
      <AppText variant="title">{t('explore.title')}</AppText>
      <Card>
        <AppText variant="caption">{t('explore.placeholder')}</AppText>
      </Card>
    </Screen>
  );
}
