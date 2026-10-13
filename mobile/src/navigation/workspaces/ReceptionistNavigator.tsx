import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useT } from '../../i18n';
import { AddWalkInScreen } from '../../screens/workspaces/AddWalkInScreen';
import { ReceptionistAvailabilityScreen } from '../../screens/workspaces/ReceptionistAvailabilityScreen';
import { ReceptionistHomeScreen } from '../../screens/workspaces/ReceptionistHomeScreen';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { useTheme } from '../../theme/ThemeProvider';
import { haptics } from '../../ui';
import type { ReceptionistStackParamList } from '../types';

const Tab = createBottomTabNavigator<ReceptionistStackParamList>();

const ExitPlaceholder = () => null;

export function ReceptionistNavigator() {
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
        name="ReceptionistHome"
        component={ReceptionistHomeScreen}
        options={{
          tabBarLabel: t('nav.floor'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="grid-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="AvailabilityLookup"
        component={ReceptionistAvailabilityScreen}
        options={{
          tabBarLabel: t('nav.availability'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar-outline" size={size} color={color} />
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

