import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useT } from '../../i18n';
import { BarberListScreen } from '../../screens/workspaces/BarberListScreen';
import { BranchEditScreen } from '../../screens/workspaces/BranchEditScreen';
import { BranchListScreen } from '../../screens/workspaces/BranchListScreen';
import { InviteBarberScreen } from '../../screens/workspaces/InviteBarberScreen';
import { OwnerHomeScreen } from '../../screens/workspaces/OwnerHomeScreen';
import { OwnerLiveFloorScreen } from '../../screens/workspaces/OwnerLiveFloorScreen';
import { ServiceEditScreen } from '../../screens/workspaces/ServiceEditScreen';
import { ServiceListScreen } from '../../screens/workspaces/ServiceListScreen';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { useTheme } from '../../theme/ThemeProvider';
import { haptics } from '../../ui';
import type { OwnerStackParamList, OwnerTabParamList } from '../types';

const Tab = createBottomTabNavigator<OwnerTabParamList>();
const Stack = createNativeStackNavigator<OwnerStackParamList>();

const ExitPlaceholder = () => null;

function OwnerTabNavigator() {
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
        name="OwnerHome"
        component={OwnerHomeScreen as any}
        options={{
          tabBarLabel: t('nav.overview'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="briefcase-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="LiveFloor"
        component={OwnerLiveFloorScreen as any}
        options={{
          tabBarLabel: t('nav.floor'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="layers-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="BranchList"
        component={BranchListScreen as any}
        options={{
          tabBarLabel: t('nav.branches'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="business-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="ServiceList"
        component={ServiceListScreen as any}
        options={{
          tabBarLabel: t('nav.services'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="cut-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="BarberList"
        component={BarberListScreen as any}
        options={{
          tabBarLabel: t('nav.barbers'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people-outline" size={size} color={color} />
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

export function OwnerNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="OwnerTabs" component={OwnerTabNavigator} />
      <Stack.Screen name="BranchEdit" component={BranchEditScreen as any} />
      <Stack.Screen name="ServiceEdit" component={ServiceEditScreen as any} />
      <Stack.Screen name="InviteBarber" component={InviteBarberScreen as any} />
    </Stack.Navigator>
  );
}

