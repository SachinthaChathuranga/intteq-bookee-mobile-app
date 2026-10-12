import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ReceptionistHomeScreen } from '../../screens/workspaces/ReceptionistHomeScreen';
import type { ReceptionistStackParamList } from '../types';

const Stack = createNativeStackNavigator<ReceptionistStackParamList>();

export function ReceptionistNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ReceptionistHome" component={ReceptionistHomeScreen} />
    </Stack.Navigator>
  );
}
