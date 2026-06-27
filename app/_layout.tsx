import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
  Inter_900Black,
  useFonts,
} from "@expo-google-fonts/inter";
import "../global.css";
import "@/lib/networkDebug";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";

SplashScreen.preventAutoHideAsync();
const queryClient = new QueryClient();

function AuthGuard() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (isLoading) return;
    const routeSegments = segments as string[];
    const inAuthGroup = routeSegments[0] === "(auth)";
    const inResetPasswordRoute = routeSegments[1] === "reset-password";
    const inAdminRoute = routeSegments[0] === "admin";
    if (!isAuthenticated && !inAuthGroup && !inAdminRoute) {
      router.replace("/(auth)/login");
    } else if (isAuthenticated && inAuthGroup && !inResetPasswordRoute) {
      router.replace("/(tabs)");
    }
  }, [isAuthenticated, isLoading, segments]);

  return null;
}

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen
        name="book/[id]"
        options={{ presentation: "card", animation: "slide_from_right" }}
      />
      <Stack.Screen
        name="reader/[id]"
        options={{ presentation: "card", animation: "slide_from_bottom" }}
      />
      <Stack.Screen
        name="privacy-policy"
        options={{ presentation: "modal" }}
      />
      <Stack.Screen
        name="edit-profile"
        options={{ presentation: "card", animation: "slide_from_right" }}
      />
      <Stack.Screen
        name="admin"
        options={{ presentation: "card", animation: "slide_from_right" }}
      />
      <Stack.Screen name="payment" options={{ presentation: "modal" }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
    Inter_900Black,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);
  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <ErrorBoundary>
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <GestureHandlerRootView className="flex-1">
                <AuthGuard />
                <RootLayoutNav />
              </GestureHandlerRootView>
            </AuthProvider>
          </QueryClientProvider>
        </ErrorBoundary>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
