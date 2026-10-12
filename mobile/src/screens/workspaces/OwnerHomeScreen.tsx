import { View } from 'react-native';
import { AppText } from '../../components/AppText';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Screen } from '../../components/Screen';
import { useT } from '../../i18n';
import { WorkspaceHeader } from '../../navigation/workspaces/WorkspaceHeader';
import { useWorkspaceStore } from '../../store/workspaceStore';

export function OwnerHomeScreen() {
  const t = useT();
  const clearWorkspace = useWorkspaceStore((s) => s.clearWorkspace);

  return (
    <View style={{ flex: 1 }}>
      <WorkspaceHeader title={t('workspace.owner.title')} />
      <Screen>
        <Card>
          <AppText variant="body" style={{ fontWeight: '600' }}>
            {t('workspace.owner.title')}
          </AppText>
          <AppText variant="caption">{t('workspace.owner.placeholder')}</AppText>
        </Card>
        <Button variant="secondary" label={t('workspace.backToCustomer')} onPress={clearWorkspace} />
      </Screen>
    </View>
  );
}
