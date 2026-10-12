import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useEffect } from 'react';
import { CustomerHomePlaceholder } from '../screens/CustomerHomePlaceholder';
import { LanguageSelectScreen } from '../screens/LanguageSelectScreen';
import { NameScreen } from '../screens/NameScreen';
import { OtpScreen } from '../screens/OtpScreen';
import { PhoneLoginScreen } from '../screens/PhoneLoginScreen';
import { SplashScreen } from '../screens/SplashScreen';
import { useAuthStore } from '../store/authStore';
import { bootstrapAuth } from '../store/bootstrap';
import { useSettingsStore } from '../store/settingsStore';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const hydrated = useSettingsStore((s) => s.hydrated);
  const language = useSettingsStore((s) => s.language);
  const status = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    void bootstrapAuth();
  }, []);

  if (!hydrated || status === 'loading') return <SplashScreen />;

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {language === null ? (
        <Stack.Screen name="LanguageSelect" component={LanguageSelectScreen} />
      ) : status === 'signedOut' ? (
        <>
          <Stack.Screen name="PhoneLogin" component={PhoneLoginScreen} />
          <Stack.Screen name="Otp" component={OtpScreen} />
        </>
      ) : !user?.name ? (
        <Stack.Screen name="Name" component={NameScreen} />
      ) : (
        <Stack.Screen name="CustomerHome" component={CustomerHomePlaceholder} />
      )}
    </Stack.Navigator>
  );
}
