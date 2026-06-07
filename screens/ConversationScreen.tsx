import React, { useEffect } from 'react';
import { Alert, View, Text, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ConversationList } from '../components/ConversationList';
import { useChat } from '../hooks/useChat';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { downloadModel, MODEL_VERSION } from '../services/modelDownload.service';

export const ConversationScreen = () => {
  const insets = useSafeAreaInsets();
  const { loadConversations, offlineModelReady, setOfflineModelReady, modelSize, modelVersion } = useChat();
  const [isDownloading, setIsDownloading] = React.useState(false);
  const [progress, setProgress] = React.useState(0);

  useEffect(() => {
    loadConversations();
  }, []);

  const handleSelect = () => {
    // Navigate back to the Chat tab screen
    router.replace('/(tabs)' as any);
  };

  const formatSize = (bytes?: number | null) => {
    if (!bytes) return '';
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  const handleDownloadOfflineModel = async () => {
    if (offlineModelReady || isDownloading) return;

    setIsDownloading(true);
    setProgress(0);

    const success = await downloadModel(setProgress);
    setOfflineModelReady(success);
    setIsDownloading(false);

    if (!success) {
      Alert.alert('Download failed', 'Could not download or verify the offline model. Please try again.');
    }
  };

  const buttonLabel = offlineModelReady
    ? 'Model Ready'
    : isDownloading
      ? `Downloading ${Math.round(progress * 100)}%`
      : 'Download Model';

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
            disabled={offlineModelReady || isDownloading}
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
              {buttonLabel}
            </Text>
          </TouchableOpacity>
        </View>
        <Text className="mt-1 text-[10px] text-zinc-500">
          {offlineModelReady
            ? `${modelVersion ?? MODEL_VERSION} · ${formatSize(modelSize)}`
            : `${MODEL_VERSION} · persistent device storage`}
        </Text>
      </View>
      <ConversationList onSelect={handleSelect} />
    </View>
  );
};
export default ConversationScreen;
