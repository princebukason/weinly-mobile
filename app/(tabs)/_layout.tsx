import { Tabs } from "expo-router";
import { View, Text, StyleSheet } from "react-native";

function TabIcon({ label, active, color }: { label: string; active: boolean; color: string }) {
  const icons: Record<string, string> = { Home: "⬡", Track: "◎", History: "≡", Profile: "○" };
  return (
    <View style={styles.tabIcon}>
      <Text style={[styles.tabEmoji, { color: active ? color : "#475569" }]}>{icons[label]}</Text>
      <Text style={[styles.tabLabel, { color: active ? color : "#475569" }]}>{label}</Text>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#0d1424",
          borderTopColor: "rgba(255,255,255,0.08)",
          borderTopWidth: 1,
          paddingBottom: 8,
          paddingTop: 8,
          height: 64,
        },
        tabBarShowLabel: false,
      }}>
      <Tabs.Screen name="home" options={{ tabBarIcon: ({ focused }) => <TabIcon label="Home" active={focused} color="#6366f1" /> }} />
      <Tabs.Screen name="track" options={{ tabBarIcon: ({ focused }) => <TabIcon label="Track" active={focused} color="#34d399" /> }} />
      <Tabs.Screen name="history" options={{ tabBarIcon: ({ focused }) => <TabIcon label="History" active={focused} color="#fbbf24" /> }} />
      <Tabs.Screen name="profile" options={{ tabBarIcon: ({ focused }) => <TabIcon label="Profile" active={focused} color="#f472b6" /> }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabIcon: { alignItems: "center", gap: 2 },
  tabEmoji: { fontSize: 20 },
  tabLabel: { fontFamily: "Inter_600SemiBold", fontSize: 10 },
});