import { View } from 'react-native';
import { AppText } from '../components/AppText';
import { Button } from '../components/Button';
import { Screen } from '../components/Screen';
import { detectDeviceLanguage, useT } from '../i18n';
import { useSettingsStore, type Language } from '../store/settingsStore';

const LANGUAGES: Language[] = ['si', 'ta', 'en'];

export function LanguageSelectScreen() {
  const t = useT();
  const setLanguage = useSettingsStore((s) => s.setLanguage);
  const suggested = detectDeviceLanguage();
  return (
    <Screen>
      <AppText variant="title">{t('language.title')}</AppText>
      <AppText variant="caption">{t('language.subtitle')}</AppText>
      <View style={{ gap: 12, marginTop: 8 }}>
        {LANGUAGES.map((lang) => (
          <Button
            key={lang}
            label={t(`language.${lang}`)}
            variant={lang === suggested ? 'primary' : 'secondary'}
            onPress={() => setLanguage(lang)}
          />
        ))}
      </View>
    </Screen>
  );
}
