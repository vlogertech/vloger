import { Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../../src/lib/theme';

function TabIcon({ focused, label }: { focused: boolean; label: string }) {
  return (
    <View style={s.iconWrap}>
      {focused && <View style={s.dot} />}
      <Text style={[s.label, { color: focused ? COLORS.gold : COLORS.textDim }]}>{label}</Text>
    </View>
  );
}

function CreateIcon() {
  return (
    <View style={s.createBtn}>
      <Text style={s.createPlus}>+</Text>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: s.bar,
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ tabBarIcon: ({ focused }) => <TabIcon focused={focused} label="⌂" /> }}
      />
      <Tabs.Screen
        name="search"
        options={{ tabBarIcon: ({ focused }) => <TabIcon focused={focused} label="⌕" /> }}
      />
      <Tabs.Screen
        name="create"
        options={{ tabBarIcon: () => <CreateIcon /> }}
      />
      <Tabs.Screen
        name="notifications"
        options={{ tabBarIcon: ({ focused }) => <TabIcon focused={focused} label="♔" /> }}
      />
      <Tabs.Screen
        name="messages"
        options={{ tabBarIcon: ({ focused }) => <TabIcon focused={focused} label="✉" /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ tabBarIcon: ({ focused }) => <TabIcon focused={focused} label="◯" /> }}
      />
    </Tabs>
  );
}

const s = StyleSheet.create({
  bar: {
    backgroundColor: COLORS.black,
    borderTopColor: COLORS.borderLight,
    borderTopWidth: 1,
    height: 64,
    paddingBottom: 8,
  },
  iconWrap: { alignItems: 'center', justifyContent: 'center', paddingTop: 4 },
  dot: { position: 'absolute', top: -6, width: 16, height: 1, backgroundColor: COLORS.gold },
  label: { fontSize: 18 },
  createBtn: { width: 36, height: 36, backgroundColor: COLORS.gold, alignItems: 'center', justifyContent: 'center' },
  createPlus: { color: COLORS.black, fontSize: 22, fontWeight: '300', lineHeight: 26 },
});
