import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { StyleSheet, View } from 'react-native';
import { AppText } from '../../components/AppText';
import { useT } from '../../i18n';
import type { ReceptionistStackParamList } from '../../navigation/types';
import { WorkspaceHeader } from '../../navigation/workspaces/WorkspaceHeader';
import { useTheme } from '../../theme/ThemeProvider';
import { Button, Card, Screen, StatusBadge, radius, spacing } from '../../ui';

type Props = NativeStackScreenProps<ReceptionistStackParamList, 'WalkInSuccess'>;

export function WalkInSuccessModal({ route, navigation }: Props) {
  const { token, estimatedWaitMinutes, customerName } = route.params;
  const t = useT();
  const { colors } = useTheme();

  return (
    <View style={styles.flex}>
      <WorkspaceHeader title={t('walkin.tokenGenerated')} />
      <Screen>
        <View style={styles.container}>
          <Card variant="selected" padding="xl" style={styles.heroCard}>
            <View style={[styles.iconCircle, { backgroundColor: colors.primary }]}>
              <Ionicons name="ticket" size={34} color={colors.onPrimary} />
            </View>
            <AppText variant="heading2" style={styles.centerText}>
              {customerName}
            </AppText>
            <AppText
              variant="display"
              style={{
                fontSize: 48,
                lineHeight: 56,
                color: colors.primary,
                letterSpacing: 2,
              }}
            >
              {token}
            </AppText>
            <StatusBadge
              label={t('walkin.estWait', { time: `${estimatedWaitMinutes} min` })}
              tone="primary"
            />
          </Card>

          <Button
            label={t('common.done')}
            size="lg"
            onPress={() => navigation.navigate('ReceptionistTabs', { screen: 'FloorTab' })}
          />
        </View>
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    gap: spacing.xl,
  },
  heroCard: {
    alignItems: 'center',
    gap: spacing.md,
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerText: {
    textAlign: 'center',
  },
});
