import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { BarberListScreen } from '../../screens/workspaces/BarberListScreen';
import { BranchEditScreen } from '../../screens/workspaces/BranchEditScreen';
import { BranchListScreen } from '../../screens/workspaces/BranchListScreen';
import { InviteBarberScreen } from '../../screens/workspaces/InviteBarberScreen';
import { OwnerHomeScreen } from '../../screens/workspaces/OwnerHomeScreen';
import { ServiceEditScreen } from '../../screens/workspaces/ServiceEditScreen';
import { ServiceListScreen } from '../../screens/workspaces/ServiceListScreen';
import type { OwnerStackParamList } from '../types';

const Stack = createNativeStackNavigator<OwnerStackParamList>();

export function OwnerNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
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
