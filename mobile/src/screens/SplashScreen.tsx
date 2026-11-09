import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import { ActivityIndicator, Animated, StyleSheet, View } from 'react-native';
import { AppText } from '../components/AppText';
import { Screen } from '../components/Screen';
import { appConfig } from '../config/app';
import { useT } from '../i18n';
import { useTheme } from '../theme/ThemeProvider';
import { getShadow, radius, spacing } from '../ui/tokens';

export function SplashScreen() {
  const { colors } = useTheme();
  const t = useT();
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        speed: 16,
        bounciness: 6,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacityAnim, scaleAnim]);

  return (
    <Screen scroll={false}>
      <View style={styles.center}>
        <Animated.View
          style={[
            styles.brandCluster,
            { opacity: opacityAnim, transform: [{ scale: scaleAnim }] },
          ]}
        >
          <View
            style={[
              styles.logoBadge,
              getShadow(colors, 'lg'),
              { backgroundColor: colors.primary },
            ]}
          >
            <Ionicons name="cut" size={38} color={colors.onPrimary} />
          </View>
          <View style={styles.titleBlock}>
            <AppText variant="display" style={styles.centerText}>
              {appConfig.name}
            </AppText>
            <AppText variant="bodySmall" style={[styles.centerText, { color: colors.textMuted }]}>
              {t('splash.tagline')}
            </AppText>
          </View>
        </Animated.View>

        <View style={styles.loaderWrap}>
          <ActivityIndicator size="small" color={colors.primary} />
          <AppText variant="caption" style={{ color: colors.textMuted }}>
            {t('app.loading')}
          </AppText>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xxl,
  },
  brandCluster: {
    alignItems: 'center',
    gap: spacing.lg,
  },
  logoBadge: {
    width: 84,
    height: 84,
    borderRadius: radius.xxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleBlock: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  centerText: {
    textAlign: 'center',
  },
  loaderWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
});
