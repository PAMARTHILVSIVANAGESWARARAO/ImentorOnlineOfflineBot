import { useMemo } from 'react';
import { LLAMA3_2_1B_SPINQUANT, useLLM } from 'react-native-executorch';
import { getModelPath } from '../services/modelDownload.service';
import { useChatStore } from '../store/chat.store';

export const useOfflineChat = () => {
  const offlineModelReady = useChatStore((state) => state.offlineModelReady);
  const localModel = useMemo(
    () => ({
      ...LLAMA3_2_1B_SPINQUANT,
      modelSource: getModelPath(),
    }),
    []
  );

  const llm = useLLM({ model: localModel, preventLoad: !offlineModelReady });

  const sendOfflineMessage = async (content: string): Promise<string> => {
    if (!llm.isReady) {
      throw new Error('Offline model is still loading.');
    }
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
