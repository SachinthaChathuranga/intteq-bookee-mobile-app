import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AddWalkInScreen } from '../../screens/workspaces/AddWalkInScreen';
import { BarberHomeScreen } from '../../screens/workspaces/BarberHomeScreen';
import { EndShiftScreen } from '../../screens/workspaces/EndShiftScreen';
import type { BarberStackParamList } from '../types';

const Stack = createNativeStackNavigator<BarberStackParamList>();

export function BarberNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="BarberHome" component={BarberHomeScreen} />
      <Stack.Screen name="EndShift" component={EndShiftScreen} />
      <Stack.Screen name="AddWalkIn" component={AddWalkInScreen} />
    </Stack.Navigator>
  );
}
