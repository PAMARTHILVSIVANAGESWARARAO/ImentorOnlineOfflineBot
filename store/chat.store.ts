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
  onboardingCompleted: boolean;
  isStreaming: boolean;
  isThinking: boolean;
  streamingText: string;

  // Actions
  setConnected: (connected: boolean) => void;
  setOfflineModelReady: (ready: boolean) => void;
  setOnboardingCompleted: (completed: boolean) => void;
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
      onboardingCompleted: false,
      isStreaming: false,
      isThinking: false,
      streamingText: '',

      setConnected: (connected) => set({ isConnected: connected }),
      setOfflineModelReady: (ready) => set({ offlineModelReady: ready }),
      setOnboardingCompleted: (completed) => set({ onboardingCompleted: completed }),
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
        onboardingCompleted: state.onboardingCompleted,
      }),
    }
  )
);
