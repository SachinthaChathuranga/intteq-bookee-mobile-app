import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useT } from '../../i18n';
import { AddWalkInScreen } from '../../screens/workspaces/AddWalkInScreen';
import { BarberHomeScreen } from '../../screens/workspaces/BarberHomeScreen';
import { EndShiftScreen } from '../../screens/workspaces/EndShiftScreen';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { useTheme } from '../../theme/ThemeProvider';
import { haptics } from '../../ui';
import type { BarberStackParamList } from '../types';

const Tab = createBottomTabNavigator<BarberStackParamList>();

const ExitPlaceholder = () => null;

export function BarberNavigator() {
  const t = useT();
  const { colors } = useTheme();
  const clearWorkspace = useWorkspaceStore((s) => s.clearWorkspace);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: 60,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      }}
    >
      <Tab.Screen
        name="BarberHome"
        component={BarberHomeScreen}
        options={{
          tabBarLabel: t('nav.queue'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="AddWalkIn"
        component={AddWalkInScreen as any}
        options={{
          tabBarLabel: t('nav.walkin'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-add-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="EndShift"
        component={EndShiftScreen as any}
        options={{
          tabBarLabel: t('nav.shift'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="timer-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="ExitWorkspace"
        component={ExitPlaceholder as any}
        options={{
          tabBarLabel: t('nav.exitWorkspace'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="arrow-back-circle-outline" size={size} color={color} />
          ),
        }}
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
            haptics.light();
            clearWorkspace();
          },
        }}
      />
    </Tab.Navigator>
  );
}

