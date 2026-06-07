import { useEffect, useMemo, useRef } from 'react';
import { LLAMA3_2_1B_SPINQUANT, useLLM } from 'react-native-executorch';
import { getModelPath, getTokenizerPath, getTokenizerConfigPath } from '../services/modelDownload.service';
import { useChatStore } from '../store/chat.store';

export const useOfflineChat = () => {
  const offlineModelReady = useChatStore((state) => state.offlineModelReady);
  const isConnected = useChatStore((state) => state.isConnected);
  const readyRef = useRef(false);
  const errorRef = useRef<unknown>(null);
  const localModel = useMemo(
    () => ({
      ...LLAMA3_2_1B_SPINQUANT,
      modelSource: getModelPath(),
      tokenizerSource: getTokenizerPath(),
      tokenizerConfigSource: getTokenizerConfigPath(),
    }),
    []
  );

  const preventLoad = !offlineModelReady || isConnected;
  const llm = useLLM({ model: localModel, preventLoad });

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
