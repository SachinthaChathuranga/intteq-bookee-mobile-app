import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useT } from '../../i18n';
import { BarberAppointmentsScreen } from '../../screens/workspaces/BarberAppointmentsScreen';
import { BarberHomeScreen } from '../../screens/workspaces/BarberHomeScreen';
import { CompleteServiceModal } from '../../screens/workspaces/CompleteServiceModal';
import { EndShiftScreen } from '../../screens/workspaces/EndShiftScreen';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { useTheme } from '../../theme/ThemeProvider';
import type { BarberStackParamList, BarberTabParamList } from '../types';

const Stack = createNativeStackNavigator<BarberStackParamList>();
const Tab = createBottomTabNavigator<BarberTabParamList>();

function ExitPlaceholder() {
  return null;
}

function BarberTabs() {
  const { colors } = useTheme();
  const t = useT();
  const clearWorkspace = useWorkspaceStore((s) => s.clearWorkspace);
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, Platform.OS === 'ios' ? 20 : 10);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          paddingTop: 8,
          paddingBottom: bottomPad,
          height: 58 + bottomPad,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
        },
        tabBarIcon: ({ focused, color }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'people-outline';

          if (route.name === 'QueueTab') {
            iconName = focused ? 'people' : 'people-outline';
          } else if (route.name === 'AppointmentsTab') {
            iconName = focused ? 'calendar' : 'calendar-outline';
          } else if (route.name === 'ShiftTab') {
            iconName = focused ? 'time' : 'time-outline';
          } else if (route.name === 'ExitTab') {
            iconName = 'exit-outline';
          }

          return <Ionicons name={iconName} size={22} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name="QueueTab"
        component={BarberHomeScreen as any}
        options={{ title: t('nav.queue') }}
      />
      <Tab.Screen
        name="AppointmentsTab"
        component={BarberAppointmentsScreen}
        options={{ title: t('nav.appointments') }}
      />
      <Tab.Screen
        name="ShiftTab"
        component={EndShiftScreen as any}
        options={{ title: t('nav.shift') }}
      />
      <Tab.Screen
        name="ExitTab"
        component={ExitPlaceholder}
        options={{ title: t('nav.exitWorkspace') }}
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
            clearWorkspace();
          },
        }}
      />
    </Tab.Navigator>
  );
}

export function BarberNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="BarberTabs" component={BarberTabs} />
      <Stack.Screen name="BarberHome" component={BarberHomeScreen} />
      <Stack.Screen
        name="CompleteService"
        component={CompleteServiceModal}
        options={{ presentation: 'modal' }}
      />
      <Stack.Screen name="EndShift" component={EndShiftScreen} />
    </Stack.Navigator>
  );
}
