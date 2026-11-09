import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
import type { OwnerStackParamList, OwnerTabParamList } from '../types';

const Stack = createNativeStackNavigator<OwnerStackParamList>();
const Tab = createBottomTabNavigator<OwnerTabParamList>();

function ExitPlaceholder() {
  return null;
}

function OwnerTabs() {
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
          let iconName: keyof typeof Ionicons.glyphMap = 'stats-chart-outline';

          if (route.name === 'OverviewTab') {
            iconName = focused ? 'stats-chart' : 'stats-chart-outline';
          } else if (route.name === 'LiveFloorTab') {
            iconName = focused ? 'pulse' : 'pulse-outline';
          } else if (route.name === 'BranchesTab') {
            iconName = focused ? 'business' : 'business-outline';
          } else if (route.name === 'ServicesTab') {
            iconName = focused ? 'cut' : 'cut-outline';
          } else if (route.name === 'BarbersTab') {
            iconName = focused ? 'people' : 'people-outline';
          } else if (route.name === 'ExitTab') {
            iconName = 'exit-outline';
          }

          return <Ionicons name={iconName} size={22} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name="OverviewTab"
        component={OwnerHomeScreen as any}
        options={{ title: t('nav.overview') }}
      />
      <Tab.Screen
        name="LiveFloorTab"
        component={OwnerLiveFloorScreen}
        options={{ title: t('nav.floor') }}
      />
      <Tab.Screen
        name="BranchesTab"
        component={BranchListScreen as any}
        options={{ title: t('nav.branches') }}
      />
      <Tab.Screen
        name="ServicesTab"
        component={ServiceListScreen as any}
        options={{ title: t('nav.services') }}
      />
      <Tab.Screen
        name="BarbersTab"
        component={BarberListScreen as any}
        options={{ title: t('nav.barbers') }}
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

export function OwnerNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="OwnerTabs" component={OwnerTabs} />
      <Stack.Screen name="OwnerHome" component={OwnerHomeScreen} />
      <Stack.Screen name="BranchList" component={BranchListScreen} />
      <Stack.Screen name="BranchEdit" component={BranchEditScreen} />
      <Stack.Screen name="ServiceList" component={ServiceListScreen} />
      <Stack.Screen name="ServiceEdit" component={ServiceEditScreen} />
      <Stack.Screen name="BarberList" component={BarberListScreen} />
      <Stack.Screen name="InviteBarber" component={InviteBarberScreen} />
    </Stack.Navigator>
  );
}
