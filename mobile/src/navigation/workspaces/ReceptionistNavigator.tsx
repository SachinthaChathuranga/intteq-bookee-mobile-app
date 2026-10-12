import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AddWalkInScreen } from '../../screens/workspaces/AddWalkInScreen';
import { ReceptionistHomeScreen } from '../../screens/workspaces/ReceptionistHomeScreen';
import type { ReceptionistStackParamList } from '../types';

const Stack = createNativeStackNavigator<ReceptionistStackParamList>();

export function ReceptionistNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ReceptionistHome" component={ReceptionistHomeScreen} />
      <Stack.Screen name="AddWalkIn" component={AddWalkInScreen} />
    </Stack.Navigator>
  );
}
