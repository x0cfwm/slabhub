import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import * as React from 'react';
import { useState, useEffect } from 'react';
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { queryClient } from "@/lib/query-client";
import { AppProvider } from "@/contexts/AppContext";
import { StatusBar } from "expo-status-bar";
import Colors from "@/constants/colors";

SplashScreen.preventAutoHideAsync();

const c = Colors.dark;

import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { useRouter, useSegments } from "expo-router";

function RootLayoutNav() {
  const { sessionToken, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = (segments[0] as string) === "(auth)";

    if (!sessionToken && !inAuthGroup) {
      // Redirect to the login page if they are not signed in.
      router.replace("/(auth)/login" as any);
    } else if (sessionToken && inAuthGroup) {
      // Redirect away from the login page if they are signed in.
      router.replace("/(tabs)/inventory");
    }
  }, [sessionToken, isLoading, segments]);

  if (isLoading) {
    return null; // Or a dedicated splash screen/loader
  }

  return (
    <Stack
      screenOptions={{
        headerBackTitle: "Back",
        headerStyle: { backgroundColor: c.background },
        headerTintColor: c.text,
        contentStyle: { backgroundColor: c.background },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)/login" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)/otp" options={{ headerShown: false }} />
      <Stack.Screen
        name="add-item"
        options={{
          headerShown: false,
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="item/[id]"
        options={{
          headerShown: false,
        }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <GestureHandlerRootView>
          <KeyboardProvider>
            <AuthProvider>
              <AppProvider>
                <StatusBar style="light" />
                <RootLayoutNav />
              </AppProvider>
            </AuthProvider>
          </KeyboardProvider>
        </GestureHandlerRootView>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
