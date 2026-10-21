import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LogBox } from 'react-native';
import { Provider } from '@/components/Provider';
import { useEffect } from 'react';
import { ensureDefaults } from '@/lib/db';
import { configureNotifications, requestNotificationPermission } from '@/lib/notify';

import '../global.css';

LogBox.ignoreLogs([
  "TurboModuleRegistry.getEnforcing(...): 'RNMapsAirModule' could not be found",
  '[Reanimated]',
]);

export default function RootLayout() {
  useEffect(() => {
    ensureDefaults();
    configureNotifications();
    requestNotificationPermission();
  }, []);

  return (
    <Provider>
      <Stack screenOptions={{ animation: 'slide_from_right', headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="task-create" />
        <Stack.Screen name="anxiety" />
        <Stack.Screen name="ledger" />
        <Stack.Screen name="stops" />
        <Stack.Screen name="weekly-report" />
        <Stack.Screen name="timescheme" />
        <Stack.Screen name="notifications" />
        <Stack.Screen name="llm" />
        <Stack.Screen name="export" />
      </Stack>
      <StatusBar style="dark" />
    </Provider>
  );
}