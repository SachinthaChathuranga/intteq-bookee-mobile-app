import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { BarberHomeScreen } from '../../screens/workspaces/BarberHomeScreen';
import type { BarberStackParamList } from '../types';

const Stack = createNativeStackNavigator<BarberStackParamList>();

export function BarberNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="BarberHome" component={BarberHomeScreen} />
    </Stack.Navigator>
  );
}
