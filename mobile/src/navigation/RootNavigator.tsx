import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useEffect } from 'react';
import { LanguageSelectScreen } from '../screens/LanguageSelectScreen';
import { NameScreen } from '../screens/NameScreen';
import { OtpScreen } from '../screens/OtpScreen';
import { PhoneLoginScreen } from '../screens/PhoneLoginScreen';
import { SplashScreen } from '../screens/SplashScreen';
import { useAuthStore } from '../store/authStore';
import { bootstrapAuth } from '../store/bootstrap';
import { useSettingsStore } from '../store/settingsStore';
import { useWorkspaceStore } from '../store/workspaceStore';
import { CustomerTabNavigator } from './CustomerTabNavigator';
import type { RootStackParamList } from './types';
import { AdminNavigator } from './workspaces/AdminNavigator';
import { BarberNavigator } from './workspaces/BarberNavigator';
import { OwnerNavigator } from './workspaces/OwnerNavigator';
import { ReceptionistNavigator } from './workspaces/ReceptionistNavigator';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const hydrated = useSettingsStore((s) => s.hydrated);
  const language = useSettingsStore((s) => s.language);
  const status = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);
  const activeWorkspace = useWorkspaceStore((s) => s.activeWorkspace);

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
      ) : activeWorkspace?.role === 'OWNER' ? (
        <Stack.Screen name="OwnerApp" component={OwnerNavigator} />
      ) : activeWorkspace?.role === 'BARBER' ? (
        <Stack.Screen name="BarberApp" component={BarberNavigator} />
      ) : activeWorkspace?.role === 'RECEPTIONIST' ? (
        <Stack.Screen name="ReceptionistApp" component={ReceptionistNavigator} />
      ) : activeWorkspace?.role === 'SUPER_ADMIN' ? (
        <Stack.Screen name="AdminApp" component={AdminNavigator} />
      ) : (
        <Stack.Screen name="CustomerApp" component={CustomerTabNavigator} />
      )}
    </Stack.Navigator>
  );
}
