import { Stack } from "expo-router";
import { ThemeProvider, DarkTheme } from "@react-navigation/native";
import { useEffect } from 'react';
import { initExecutorch } from 'react-native-executorch';
import { ExpoResourceFetcher } from 'react-native-executorch-expo-resource-fetcher';
import { initNetworkMonitoring } from '../services/network.service';
import { isModelDownloaded, getModelPath, getModelInfo, MODEL_VERSION } from '../services/modelDownload.service';
import { useChatStore } from '../store/chat.store';
import { useSyncQueue } from '../hooks/useSyncQueue';
import "./globals.css";

initExecutorch({
  resourceFetcher: ExpoResourceFetcher,
});

export default function RootLayout() {
  useSyncQueue();

  // Initialize network status monitoring
  useEffect(() => {
    const unsubscribe = initNetworkMonitoring();
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  useEffect(() => {
    const reconcileModelState = async () => {
      const store = useChatStore.getState();
      const downloaded = await isModelDownloaded();

      if (!downloaded && store.offlineModelReady) {
        store.resetModelMetadata();
        return;
      }

      if (downloaded && !store.offlineModelReady) {
        const info = await getModelInfo();
        store.setModelMetadata({
          modelPath: getModelPath(),
          modelVersion: MODEL_VERSION,
          modelSize: info.size ?? 0,
          downloadedAt: store.downloadedAt ?? new Date().toISOString(),
        });
        store.setOfflineModelReady(true);
      }
    };

    reconcileModelState().catch((error) => {
      console.error('Failed to reconcile offline model state:', error);
    });
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
