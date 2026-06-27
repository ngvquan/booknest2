import { useColors } from "@/hooks/useColors";
import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { Tabs } from "expo-router";
import React from "react";
import { Platform } from "react-native";

export default function TabLayout() {
  const colors = useColors();
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.tabBarActive,
        tabBarInactiveTintColor: colors.tabBarInactive,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS ? "transparent" : colors.tabBar,
          borderTopWidth: 1,
          borderTopColor: colors.tabBarBorder,
          elevation: 0,
          height: isWeb ? 84 : 64,
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView
              className="absolute inset-0"
              intensity={90}
              tint="systemChromeMaterial"
            />
          ) : null,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
          marginBottom: isWeb ? 12 : 4,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Khám phá",
          tabBarIcon: ({ color }) => <Feather name="compass" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: "Tìm kiếm",
          tabBarIcon: ({ color }) => <Feather name="search" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: "Thư viện",
          tabBarIcon: ({ color }) => <Feather name="bookmark" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Tôi",
          tabBarIcon: ({ color }) => <Feather name="user" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="premium"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
