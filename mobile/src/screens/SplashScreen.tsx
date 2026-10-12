import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { APP_NAME } from '../config/app';
import { AppText } from '../components/AppText';
import { useTheme } from '../theme/ThemeProvider';

export function SplashScreen() {
  const { colors } = useTheme();
  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Text mark placeholder until a logo exists (SPEC §1.1). */}
      <AppText variant="title" style={{ color: colors.primary }}>
        {APP_NAME}
      </AppText>
      <ActivityIndicator color={colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
});
