import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '../../components/AppText';
import { Badge } from '../../components/Badge';
import { useT } from '../../i18n';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { useTheme } from '../../theme/ThemeProvider';

interface Props {
  title: string;
  onBack?: () => void;
}

export function WorkspaceHeader({ title, onBack }: Props) {
  const t = useT();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const activeWorkspace = useWorkspaceStore((s) => s.activeWorkspace);

  const businessName = activeWorkspace?.business_name ?? '';

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top + 8,
          backgroundColor: colors.surface,
          borderBottomColor: colors.border,
        },
      ]}
    >
      <View style={styles.topRow}>
        {onBack ? (
          <Pressable
            accessibilityRole="button"
            onPress={onBack}
            style={({ pressed }) => [
              styles.backButton,
              { backgroundColor: colors.background, borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <AppText style={{ color: colors.primary, fontWeight: '700', fontSize: 14 }}>
              {`← ${t('common.back')}`}
            </AppText>
          </Pressable>
        ) : (
          <View style={{ flex: 1 }}>
            {businessName ? (
              <AppText variant="caption" style={{ color: colors.textMuted, fontWeight: '700' }}>
                {businessName}
              </AppText>
            ) : null}
          </View>
        )}

        {activeWorkspace ? (
          <Badge
            label={t(`role.${activeWorkspace.role}`)}
            variant={
              activeWorkspace.role === 'OWNER'
                ? 'primary'
                : activeWorkspace.role === 'BARBER'
                ? 'success'
                : 'warning'
            }
          />
        ) : null}
      </View>

      <View style={styles.titleRow}>
        <AppText variant="title" style={{ fontSize: 26, lineHeight: 32, fontWeight: '800' }}>
          {title}
        </AppText>
      </View>
    </View>
  );

}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    gap: 12,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  titleRow: {
    gap: 2,
  },
});
