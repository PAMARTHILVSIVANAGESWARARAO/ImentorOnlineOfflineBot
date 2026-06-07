import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Conversation, Message } from '../types/chat.types';

interface ChatStore {
  conversations: Conversation[];
  activeConversation: Conversation | null;
  messages: Message[];
  isConnected: boolean;
  offlineModelReady: boolean;
  offlineModelIncompatible: boolean;
  modelPath: string | null;
  modelVersion: string | null;
  modelSize: number | null;
  downloadedAt: string | null;
  onboardingCompleted: boolean;
  syncing: boolean;
  isStreaming: boolean;
  isThinking: boolean;
  streamingText: string;

  // Actions
  setConnected: (connected: boolean) => void;
  setOfflineModelReady: (ready: boolean) => void;
  setOfflineModelIncompatible: (incompatible: boolean) => void;
  setModelMetadata: (metadata: {
    modelPath: string;
    modelVersion: string;
    modelSize: number;
    downloadedAt: string;
  }) => void;
  resetModelMetadata: () => void;
  setOnboardingCompleted: (completed: boolean) => void;
  setSyncing: (syncing: boolean) => void;
  setConversations: (conversations: Conversation[]) => void;
  setActiveConversation: (conversation: Conversation | null) => void;
  setMessages: (messages: Message[]) => void;
  addMessage: (message: Message) => void;
  setStreaming: (isStreaming: boolean) => void;
  setThinking: (isThinking: boolean) => void;
  setStreamingText: (text: string) => void;
  resetChat: () => void;
}

export const useChatStore = create<ChatStore>()(
  persist(
    (set) => ({
      conversations: [],
      activeConversation: null,
      messages: [],
      isConnected: true,
      offlineModelReady: false,
      offlineModelIncompatible: false,
      modelPath: null,
      modelVersion: null,
      modelSize: null,
      downloadedAt: null,
      onboardingCompleted: false,
      syncing: false,
      isStreaming: false,
      isThinking: false,
      streamingText: '',

      setConnected: (connected) => set({ isConnected: connected }),
      setOfflineModelReady: (ready) => set({ offlineModelReady: ready }),
      setOfflineModelIncompatible: (incompatible) => set({ offlineModelIncompatible: incompatible }),
      setModelMetadata: (metadata) => set(metadata),
      resetModelMetadata: () =>
        set({
          offlineModelReady: false,
          offlineModelIncompatible: false,
          modelPath: null,
          modelVersion: null,
          modelSize: null,
          downloadedAt: null,
        }),
      setOnboardingCompleted: (completed) => set({ onboardingCompleted: completed }),
      setSyncing: (syncing) => set({ syncing }),
      setConversations: (conversations) => set({ conversations }),
      setActiveConversation: (activeConversation) => set({ activeConversation }),
      setMessages: (messages) => set({ messages }),
      addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
      setStreaming: (isStreaming) => set({ isStreaming }),
      setThinking: (isThinking) => set({ isThinking }),
      setStreamingText: (streamingText) => set({ streamingText }),
      resetChat: () => set({ activeConversation: null, messages: [], isStreaming: false, isThinking: false, streamingText: '' }),
    }),
    {
      name: 'imentor-chat-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        offlineModelReady: state.offlineModelReady,
        offlineModelIncompatible: state.offlineModelIncompatible,
        modelPath: state.modelPath,
        modelVersion: state.modelVersion,
        modelSize: state.modelSize,
        downloadedAt: state.downloadedAt,
        onboardingCompleted: state.onboardingCompleted,
      }),
    }
  )
);
