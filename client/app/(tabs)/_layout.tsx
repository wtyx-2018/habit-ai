import { Tabs } from 'expo-router';
import { Platform, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesome6 } from '@expo/vector-icons';
import { C } from '@/theme';

function TabIcon({ icon, color, focused }: { icon: string; color: string; focused: boolean }) {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <FontAwesome6 name={icon} size={20} color={color} />
      {/* 选中态：图标下短细指示线 */}
      <View
        style={{
          width: 16, height: 3, borderRadius: 2,
          backgroundColor: focused ? C.primary : 'transparent',
          marginTop: 3,
        }}
      />
    </View>
  );
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  let tabBarStyle: object = {
    backgroundColor: C.background,
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingBottom: insets.bottom > 0 ? 6 : 4,
    height: 60 + (insets.bottom > 0 ? insets.bottom : 0),
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
        tabBarInactiveTintColor: C.placeholder,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '500' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: '今日',
          tabBarIcon: ({ color, focused }) => <TabIcon icon="sun" color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="goals"
        options={{
          title: '目标',
          tabBarIcon: ({ color, focused }) => <TabIcon icon="layer-group" color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="habits"
        options={{
          title: '习惯',
          tabBarIcon: ({ color, focused }) => <TabIcon icon="repeat" color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="journal"
        options={{
          title: '复盘',
          tabBarIcon: ({ color, focused }) => <TabIcon icon="book" color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: '我的',
          tabBarIcon: ({ color, focused }) => <TabIcon icon="user" color={color} focused={focused} />,
        }}
      />
    </Tabs>
  );
}