import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { BookingScreen } from '../screens/customer/BookingScreen';
import { CustomerTabNavigator } from './CustomerTabNavigator';
import type { CustomerStackParamList } from './types';

const Stack = createNativeStackNavigator<CustomerStackParamList>();

export function CustomerNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="CustomerTabs" component={CustomerTabNavigator} />
      <Stack.Screen name="Booking" component={BookingScreen as any} />
    </Stack.Navigator>
  );
}
