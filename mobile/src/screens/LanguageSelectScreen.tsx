import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '../components/AppText';
import { Button } from '../components/Button';
import { Screen } from '../components/Screen';
import { appConfig } from '../config/app';
import { SUPPORTED_LANGUAGES, useT, type Language } from '../i18n';
import type { RootStackParamList } from '../navigation/types';
import { useSettingsStore } from '../store/settingsStore';
import { useTheme } from '../theme/ThemeProvider';
import { Badge } from '../ui/Badge';
import { selectionFeedback } from '../ui/haptics';
import { getShadow, radius, spacing } from '../ui/tokens';

type Props = NativeStackScreenProps<RootStackParamList, 'LanguageSelect'>;

const LANGUAGE_META: Record<Language, { native: string; subtitle: string; code: string }> = {
  en: { native: 'English', subtitle: 'Default international language', code: 'EN' },
  si: { native: 'සිංහල', subtitle: 'ශ්‍රී ලංකාවේ සිංහල භාෂාව', code: 'සිං' },
  ta: { native: 'தமிழ்', subtitle: 'இலங்கை தமிழ் மொழி', code: 'த' },
};

export function LanguageSelectScreen({ navigation }: Props) {
  const t = useT();
  const { colors } = useTheme();
  const language = useSettingsStore((s) => s.language) ?? 'en';
  const setLanguage = useSettingsStore((s) => s.setLanguage);

  const handleContinue = () => {
    void setLanguage(language);
    navigation.replace('PhoneLogin');
  };

  return (
    <Screen>
      <View style={styles.container}>
        <View style={styles.topSection}>
          <View style={styles.brandHeader}>
            <View style={[styles.brandIcon, { backgroundColor: colors.primary }]}>
              <Ionicons name="cut" size={22} color={colors.onPrimary} />
            </View>
            <AppText variant="heading2">{appConfig.name}</AppText>
          </View>

          <View style={styles.headerText}>
            <Badge label={t('language.stepTag')} tone="primary" size="sm" />
            <AppText variant="largeHeading">{t('language.title')}</AppText>
            <AppText variant="body" style={{ color: colors.textSecondary }}>
              {t('language.subtitle')}
            </AppText>
          </View>

          <View style={styles.optionsList}>
            {SUPPORTED_LANGUAGES.map((lang) => {
              const selected = lang === language;
              const meta = LANGUAGE_META[lang];
              return (
                <Pressable
                  key={lang}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  onPress={() => {
                    selectionFeedback();
                    void setLanguage(lang);
                  }}
                  style={[
                    styles.optionCard,
                    selected && getShadow(colors, 'sm'),
                    {
                      borderColor: selected ? colors.primary : colors.border,
                      backgroundColor: selected ? colors.primaryLight : colors.surface,
                      borderWidth: selected ? 1.5 : 1,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.langMonogram,
                      {
                        backgroundColor: selected ? colors.primary : colors.inputBackground,
                      },
                    ]}
                  >
                    <AppText
                      variant="bodyBold"
                      style={{
                        color: selected ? colors.onPrimary : colors.textSecondary,
                        fontWeight: '700',
                      }}
                    >
                      {meta.code}
                    </AppText>
                  </View>

                  <View style={styles.langInfo}>
                    <AppText
                      variant="heading3"
                      style={{ color: selected ? colors.primary : colors.text }}
                    >
                      {t(`language.${lang}`)}
                    </AppText>
                    <AppText variant="caption" style={{ color: colors.textMuted }}>
                      {meta.subtitle}
                    </AppText>
                  </View>

                  <View
                    style={[
                      styles.radioOuter,
                      {
                        borderColor: selected ? colors.primary : colors.border,
                        backgroundColor: selected ? colors.primary : 'transparent',
                      },
                    ]}
                  >
                    {selected ? (
                      <Ionicons name="checkmark" size={14} color={colors.onPrimary} />
                    ) : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.footer}>
          <Button label={t('common.continue')} onPress={handleContinue} />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
  },
  topSection: {
    gap: spacing.xl,
  },
  brandHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
  },
  brandIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    gap: spacing.sm,
  },
  optionsList: {
    gap: spacing.md,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: radius.lg,
    gap: spacing.md,
  },
  langMonogram: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  langInfo: {
    flex: 1,
    gap: 2,
  },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    paddingTop: spacing.lg,
  },
});
