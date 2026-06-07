import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ConversationList } from '../components/ConversationList';
import { useChat } from '../hooks/useChat';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export const ConversationScreen = () => {
  const insets = useSafeAreaInsets();
  const { loadConversations, offlineModelReady } = useChat();

  useEffect(() => {
    loadConversations();
  }, []);

  const handleSelect = () => {
    // Navigate back to the Chat tab screen
    router.replace('/(tabs)' as any);
  };

  const handleDownloadOfflineModel = () => {};

  return (
    <View 
      style={{
        flex: 1,
        paddingTop: insets.top,
        backgroundColor: '#09090b',
      }}
    >
      <View className="px-4 py-3 bg-zinc-950 border-b border-zinc-800/80">
        <View className="flex-row items-center justify-between gap-3">
          <Text className="text-white text-base font-bold">Chat History</Text>
          <TouchableOpacity
            onPress={handleDownloadOfflineModel}
            disabled={offlineModelReady}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={
              offlineModelReady ? 'Offline model already downloaded' : 'Download offline model'
            }
            className={`flex-row items-center rounded-xl px-3 py-2 ${
              offlineModelReady ? 'bg-zinc-800 opacity-60' : 'bg-emerald-600 active:bg-emerald-700'
            }`}
          >
            <Ionicons
              name={offlineModelReady ? 'checkmark-circle' : 'download-outline'}
              size={15}
              color="#ffffff"
            />
            <Text className="ml-1.5 text-xs font-bold text-white">
              {offlineModelReady ? 'Model Ready' : 'Download Model'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      <ConversationList onSelect={handleSelect} />
    </View>
  );
};
export default ConversationScreen;
