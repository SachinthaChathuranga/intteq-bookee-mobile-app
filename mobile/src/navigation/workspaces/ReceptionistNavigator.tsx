import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useT } from '../../i18n';
import { AddWalkInScreen } from '../../screens/workspaces/AddWalkInScreen';
import { ReceptionistAvailabilityScreen } from '../../screens/workspaces/ReceptionistAvailabilityScreen';
import { ReceptionistHomeScreen } from '../../screens/workspaces/ReceptionistHomeScreen';
import { WalkInSuccessModal } from '../../screens/workspaces/WalkInSuccessModal';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { useTheme } from '../../theme/ThemeProvider';
import type { ReceptionistStackParamList, ReceptionistTabParamList } from '../types';

const Stack = createNativeStackNavigator<ReceptionistStackParamList>();
const Tab = createBottomTabNavigator<ReceptionistTabParamList>();

function ExitPlaceholder() {
  return null;
}

function ReceptionistTabs() {
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
          let iconName: keyof typeof Ionicons.glyphMap = 'grid-outline';

          if (route.name === 'FloorTab') {
            iconName = focused ? 'grid' : 'grid-outline';
          } else if (route.name === 'WalkInTab') {
            iconName = focused ? 'person-add' : 'person-add-outline';
          } else if (route.name === 'AvailabilityTab') {
            iconName = focused ? 'calendar' : 'calendar-outline';
          } else if (route.name === 'ExitTab') {
            iconName = 'exit-outline';
          }

          return <Ionicons name={iconName} size={22} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name="FloorTab"
        component={ReceptionistHomeScreen as any}
        options={{ title: t('nav.floor') }}
      />
      <Tab.Screen
        name="WalkInTab"
        component={AddWalkInScreen as any}
        options={{ title: t('nav.walkin') }}
      />
      <Tab.Screen
        name="AvailabilityTab"
        component={ReceptionistAvailabilityScreen}
        options={{ title: t('nav.availability') }}
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

export function ReceptionistNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ReceptionistTabs" component={ReceptionistTabs} />
      <Stack.Screen name="ReceptionistHome" component={ReceptionistHomeScreen} />
      <Stack.Screen name="AddWalkIn" component={AddWalkInScreen} />
      <Stack.Screen
        name="WalkInSuccess"
        component={WalkInSuccessModal}
        options={{ presentation: 'modal' }}
      />
    </Stack.Navigator>
  );
}
