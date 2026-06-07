import { useEffect, useRef, useState } from 'react';
import * as FileSystem from 'expo-file-system/legacy';
import { LLAMA3_2_1B_SPINQUANT, useLLM } from 'react-native-executorch';
import { getModelPath, getTokenizerPath, getTokenizerConfigPath } from '../services/modelDownload.service';
import { useChatStore } from '../store/chat.store';

export const useOfflineChat = () => {
  const offlineModelReady = useChatStore((state) => state.offlineModelReady);
  const isConnected = useChatStore((state) => state.isConnected);
  const [shouldLoad, setShouldLoad] = useState(false);
  const [localModel, setLocalModel] = useState<any>(null);
  const readyRef = useRef(false);
  const errorRef = useRef<unknown>(null);

  // Resolve local/remote tokenizer configurations dynamically.
  // If local files exist, we use them. Otherwise, we fall back to remote Hugging Face URLs,
  // allowing ExecuTorch to utilize its internal compiled cache.
  useEffect(() => {
    const resolveModelConfig = async () => {
      try {
        const modelPath = getModelPath();
        const tokenizerPath = getTokenizerPath();
        const configPath = getTokenizerConfigPath();

        const tokenizerInfo = await FileSystem.getInfoAsync(tokenizerPath);
        const configInfo = await FileSystem.getInfoAsync(configPath);

        setLocalModel({
          ...LLAMA3_2_1B_SPINQUANT,
          modelSource: modelPath,
          tokenizerSource: tokenizerInfo.exists && (tokenizerInfo.size ?? 0) > 0 
            ? tokenizerPath 
            : LLAMA3_2_1B_SPINQUANT.tokenizerSource,
          tokenizerConfigSource: configInfo.exists && (configInfo.size ?? 0) > 0 
            ? configPath 
            : LLAMA3_2_1B_SPINQUANT.tokenizerConfigSource,
        });
      } catch (e) {
        console.error('Failed to resolve tokenizer paths:', e);
        // Safe fallback
        setLocalModel({
          ...LLAMA3_2_1B_SPINQUANT,
          modelSource: getModelPath(),
        });
      }
    };
    resolveModelConfig();
  }, [offlineModelReady]);

  // Stable offline model loading with a settle-time delay.
  // This prevents rapid concurrent load/unload race conditions in the native JNI layer
  // during network flickering, startup network monitoring updates, or hot-reloading.
  useEffect(() => {
    if (offlineModelReady && !isConnected) {
      const timer = setTimeout(() => {
        setShouldLoad(true);
      }, 1000); // 1 second stable settle time
      return () => clearTimeout(timer);
    } else {
      setShouldLoad(false);
    }
  }, [offlineModelReady, isConnected]);

  const preventLoad = !shouldLoad || !localModel;
  const llm = useLLM({ 
    model: localModel || { ...LLAMA3_2_1B_SPINQUANT, modelSource: getModelPath() }, 
    preventLoad 
  });

  useEffect(() => {
    readyRef.current = llm.isReady;
    errorRef.current = llm.error;
  }, [llm.isReady, llm.error]);

  const waitForModelReady = async () => {
    const startedAt = Date.now();
    while (!readyRef.current) {
      if (errorRef.current) {
        throw errorRef.current;
      }

      if (Date.now() - startedAt > 60000) {
        throw new Error('Offline model did not finish loading in time.');
      }

      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  };

  const sendOfflineMessage = async (content: string): Promise<string> => {
    await waitForModelReady();
    return llm.sendMessage(content);
  };

  return {
    sendOfflineMessage,
    isReady: llm.isReady,
    isGenerating: llm.isGenerating,
    partialResponse: llm.response,
  };
};

export type OfflineChatRuntime = ReturnType<typeof useOfflineChat>;

export default useOfflineChat;
