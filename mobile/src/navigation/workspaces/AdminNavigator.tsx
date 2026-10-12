import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AdminHomeScreen } from '../../screens/workspaces/AdminHomeScreen';
import type { AdminStackParamList } from '../types';

const Stack = createNativeStackNavigator<AdminStackParamList>();

export function AdminNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AdminHome" component={AdminHomeScreen} />
    </Stack.Navigator>
  );
}
