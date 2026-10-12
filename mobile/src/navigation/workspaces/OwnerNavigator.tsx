import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { OwnerHomeScreen } from '../../screens/workspaces/OwnerHomeScreen';
import type { OwnerStackParamList } from '../types';

const Stack = createNativeStackNavigator<OwnerStackParamList>();

export function OwnerNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="OwnerHome" component={OwnerHomeScreen} />
    </Stack.Navigator>
  );
}
