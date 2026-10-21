import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesome6 } from '@expo/vector-icons';
import { C } from '@/theme';

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  let tabBarStyle: object = {
    backgroundColor: C.background,
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingBottom: insets.bottom > 0 ? 6 : 4,
    height: 58 + (insets.bottom > 0 ? insets.bottom : 0),
  };

  if (Platform.OS === 'web') {
    tabBarStyle = { ...tabBarStyle, height: 'auto' };
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle,
        tabBarActiveTintColor: C.primary,
        tabBarInactiveTintColor: C.muted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: '今日',
          tabBarIcon: ({ color }) => <FontAwesome6 name="sun" size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="goals"
        options={{
          title: '目标',
          tabBarIcon: ({ color }) => <FontAwesome6 name="layer-group" size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="habits"
        options={{
          title: '习惯',
          tabBarIcon: ({ color }) => <FontAwesome6 name="repeat" size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="journal"
        options={{
          title: '复盘',
          tabBarIcon: ({ color }) => <FontAwesome6 name="book" size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: '我的',
          tabBarIcon: ({ color }) => <FontAwesome6 name="user" size={20} color={color} />,
        }}
      />
    </Tabs>
  );
}