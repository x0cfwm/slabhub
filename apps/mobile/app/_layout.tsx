import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { queryClient } from "@/lib/query-client";
import { AppProvider } from "@/contexts/AppContext";
import { StatusBar } from "expo-status-bar";
import Colors from "@/constants/colors";

SplashScreen.preventAutoHideAsync();

const c = Colors.dark;
const ONBOARDING_KEY = '@slabhub_onboarding_completed';

import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { useRouter, useSegments } from "expo-router";

function RootLayoutNav() {
  const { sessionToken, isLoading: authLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState<boolean | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_KEY).then((value) => {
      setHasCompletedOnboarding(value === 'true');
    });
  }, [segments]);

  const isLoading = authLoading || hasCompletedOnboarding === null;

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = (segments[0] as string) === "(auth)";
    const onOnboarding = (segments[0] as string) === "onboarding";

    if (!hasCompletedOnboarding && !onOnboarding && !inAuthGroup) {
      // First launch — show onboarding before anything else.
      router.replace("/onboarding" as any);
    } else if (hasCompletedOnboarding && onOnboarding) {
      // Already completed onboarding — skip it.
      router.replace("/(auth)/login" as any);
    } else if (hasCompletedOnboarding && !sessionToken && !inAuthGroup && !onOnboarding) {
      // Onboarding done, not signed in — go to login.
      router.replace("/(auth)/login" as any);
    } else if (sessionToken && inAuthGroup) {
      // Signed in — go to main app.
      router.replace("/(tabs)/inventory");
    }
  }, [sessionToken, isLoading, segments, hasCompletedOnboarding]);

  if (isLoading) {
    return null;
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
      <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />
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
      <Stack.Screen
        name="posting"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="posting-review"
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
