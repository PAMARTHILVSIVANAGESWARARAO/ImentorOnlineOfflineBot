import { Stack } from "expo-router";
import { ThemeProvider, DarkTheme } from "@react-navigation/native";
import { useEffect } from 'react';
import { initNetworkMonitoring } from '../services/network.service';
import "./globals.css";

export default function RootLayout() {
  // Initialize network status monitoring
  useEffect(() => {
    const unsubscribe = initNetworkMonitoring();
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  return (
    <ThemeProvider value={DarkTheme}>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'fade',
        }}
      >
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </ThemeProvider>
  );
}