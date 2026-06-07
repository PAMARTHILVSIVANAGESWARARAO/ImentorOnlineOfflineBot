import React, { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import { useChatStore } from '../store/chat.store';
import { View, ActivityIndicator } from 'react-native';

export default function Index() {
  const onboardingCompleted = useChatStore((state) => state.onboardingCompleted);
  const [isReady, setIsReady] = useState(false);

  // Wait for the persisted Zustand store to hydrate from AsyncStorage
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsReady(true);
    }, 150);
    return () => clearTimeout(timer);
  }, []);

  if (!isReady) {
    return (
      <View className="flex-1 bg-zinc-950 items-center justify-center">
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }

  if (onboardingCompleted) {
    return <Redirect href={"/(tabs)" as any} />;
  }

  return <Redirect href={"/onboarding" as any} />;
}