import { useEffect } from 'react';
import { Alert } from 'react-native';
import { useChatStore } from '../store/chat.store';
import { apiService } from '../services/api.service';
import { streamService } from '../services/stream.service';
import { Conversation, Message } from '../types/chat.types';
import { getQueue, queueConversation, removeFromQueue } from '../services/offlineQueue.service';
import { syncQueuedConversation } from '../services/sync.service';
import { OfflineChatRuntime } from './useOfflineChat';

export const useChat = (offlineChat?: OfflineChatRuntime) => {
  const store = useChatStore();
  const isGenerating = offlineChat?.isGenerating ?? false;
  const partialResponse = offlineChat?.partialResponse ?? '';

  useEffect(() => {
    if (!store.isConnected && store.offlineModelReady && isGenerating) {
      store.setStreamingText(partialResponse);
    }
  }, [isGenerating, partialResponse, store.isConnected, store.offlineModelReady]);

  const buildOfflineTitle = (content: string) => {
    const words = content.trim().split(/\s+/).filter(Boolean);
    return words.length <= 5 ? content.trim() : `${words.slice(0, 5).join(' ')}...`;
  };
  
  const loadOfflineConversations = async () => {
    const queue = await getQueue();
    const offlineConversations = queue.map((entry) => {
      const lastMessage = entry.messages[entry.messages.length - 1];
      const firstMessage = entry.messages[0];

      return {
        _id: entry.conversationId,
        title: entry.conversationTitle || 'Offline Conversation',
        createdAt: firstMessage?.createdAt ?? new Date().toISOString(),
        updatedAt: lastMessage?.createdAt ?? new Date().toISOString(),
      };
    });
    store.setConversations(offlineConversations);
  };

  const loadConversations = async () => {
    try {
      if (!store.isConnected) {
        await loadOfflineConversations();
        return;
      }

      const convs = await apiService.fetchConversations();
      store.setConversations(convs);
    } catch (err) {
      console.log('Failed to load conversations online, falling back to offline list:', err);
      await loadOfflineConversations();
    }
  };

  const selectConversation = async (conversation: Conversation) => {
    try {
      store.setActiveConversation(conversation);
      if (!store.isConnected || conversation._id.startsWith('offline-')) {
        const queue = await getQueue();
        const entry = queue.find((item) => item.conversationId === conversation._id);
        store.setMessages(
          entry
            ? entry.messages.map((message) => ({
                conversationId: conversation._id,
                role: message.role,
                content: message.content,
                createdAt: message.createdAt,
              }))
            : store.messages.filter((msg) => msg.conversationId === conversation._id)
        );
        return;
      }
      const msgs = await apiService.fetchMessages(conversation._id);
      store.setMessages(msgs);
    } catch (err) {
      console.log('Failed to load messages online, attempting offline fallback:', err);
      const queue = await getQueue();
      const entry = queue.find((item) => item.conversationId === conversation._id);
      if (entry) {
        store.setMessages(
          entry.messages.map((message) => ({
            conversationId: conversation._id,
            role: message.role,
            content: message.content,
            createdAt: message.createdAt,
          }))
        );
      }
    }
  };

  const createOfflineChat = (): Conversation => {
    const now = new Date();
    const conv: Conversation = {
      _id: `offline-${Date.now()}`,
      title: 'New Conversation',
      createdAt: now,
      updatedAt: now,
    };
    store.setConversations([conv, ...store.conversations]);
    store.setActiveConversation(conv);
    store.setMessages([]);
    return conv;
  };

  const createNewChat = async (): Promise<Conversation | null> => {
    try {
      if (!store.isConnected) {
        return createOfflineChat();
      }

      const conv = await apiService.createConversation();
      await loadConversations();
      await selectConversation(conv);
      return conv;
    } catch (err) {
      console.log('Failed to create new conversation online, falling back to offline:', err);
      return createOfflineChat();
    }
  };

  const deleteConversation = async (id: string) => {
    try {
      if (!store.isConnected || id.startsWith('offline-')) {
        store.setConversations(store.conversations.filter((conversation) => conversation._id !== id));
        store.setMessages(store.messages.filter((message) => message.conversationId !== id));
        await removeFromQueue(id);
        if (store.activeConversation?._id === id) {
          store.resetChat();
        }
        return;
      }

      await apiService.deleteConversation(id);
      if (store.activeConversation?._id === id) {
        store.resetChat();
      }
      await loadConversations();
    } catch (err) {
      console.error('Failed to delete conversation:', err);
    }
  };

  const sendMessage = async (content: string) => {
    if (!content.trim()) return;
    
    // Ensure we have an active conversation. If not, create one.
    let conversation = store.activeConversation;
    if (!conversation) {
      conversation = await createNewChat();
      if (!conversation) return;
    }

    let sendSuccess = false;
    if (store.isConnected) {
      try {
        if (conversation._id.startsWith('offline-')) {
          const synced = await syncQueuedConversation(conversation._id);
          if (!synced) {
            conversation = await createNewChat();
            if (!conversation) return;
          } else {
            conversation = synced.remoteConversation;
          }
        }

        // Online mode: Stream response
        await streamService.sendMessageStream(conversation._id, content);
        sendSuccess = true;
      } catch (err) {
        console.log('Online stream failed, falling back to offline model:', err);
      }
    }

    if (!sendSuccess) {
      if (!conversation) return;
      const conversationId = conversation._id;
      
      const userMessage: Message = {
        conversationId,
        role: 'user',
        content,
        createdAt: new Date(),
      };

      // Prevent duplicate messages if already added in the streaming attempt
      const wasAdded = store.messages.some(
        (m) => m.conversationId === conversationId && m.role === 'user' && m.content === content
      );

      if (!wasAdded) {
        store.addMessage(userMessage);
      }

      store.setThinking(true);
      store.setStreaming(false);
      store.setStreamingText('');

      let replyContent = '';
      let hasOfflineError = false;

      if (store.offlineModelReady) {
        try {
          if (!offlineChat) {
            throw new Error('Offline chat runtime is not mounted.');
          }

          store.setStreaming(true);
          replyContent = await offlineChat.sendOfflineMessage(content);
        } catch (error: any) {
          console.error('Offline inference failed:', error);
          replyContent = `Offline model error: ${error.message || 'Unable to generate a response.'}`;
          hasOfflineError = true;
        } finally {
          store.setStreaming(false);
          store.setStreamingText('');
        }
      } else {
        hasOfflineError = true;
      }

      if (hasOfflineError) {
        store.setThinking(false);
        Alert.alert(
          'Connection Error',
          'You are offline or the server is unreachable, and the offline model is not available on this device. Please check your connection or download the model from Chat History (top-right button) to chat offline.',
          [{ text: 'OK' }]
        );
        // Clean up: Remove the unanswered user message from the messages array
        store.setMessages(store.messages.filter((m) => !(m.conversationId === conversationId && m.role === 'user' && m.content === content)));
        return;
      }

      const assistantMessage: Message = {
        conversationId,
        role: 'assistant',
        content: replyContent,
        createdAt: new Date(),
      };

      store.addMessage(assistantMessage);
      store.setThinking(false);

      const conversationTitle =
        conversation.title === 'New Conversation' ? buildOfflineTitle(content) : conversation.title;
      const updatedConversation: Conversation = {
        ...conversation,
        title: conversationTitle,
        updatedAt: new Date(),
      };

      store.setActiveConversation(updatedConversation);
      store.setConversations([
        updatedConversation,
        ...store.conversations.filter((item) => item._id !== conversationId),
      ]);

      await queueConversation({
        conversationId,
        conversationTitle,
        messages: [
          {
            role: 'user',
            content: userMessage.content,
            createdAt:
              userMessage.createdAt instanceof Date
                ? userMessage.createdAt.toISOString()
                : userMessage.createdAt,
          },
          {
            role: 'assistant',
            content: assistantMessage.content,
            createdAt:
              assistantMessage.createdAt instanceof Date
                ? assistantMessage.createdAt.toISOString()
                : assistantMessage.createdAt,
          },
        ],
      });

      if (store.isThinking) {
        store.setThinking(false);
      }
    }
  };

  return {
    conversations: store.conversations,
    activeConversation: store.activeConversation,
    messages: store.messages,
    isConnected: store.isConnected,
    offlineModelReady: store.offlineModelReady,
    onboardingCompleted: store.onboardingCompleted,
    isStreaming: store.isStreaming,
    isThinking: store.isThinking,
    streamingText: store.streamingText,
    syncing: store.syncing,
    modelPath: store.modelPath,
    modelVersion: store.modelVersion,
    modelSize: store.modelSize,
    downloadedAt: store.downloadedAt,
    setOfflineModelReady: store.setOfflineModelReady,
    setModelMetadata: store.setModelMetadata,
    resetModelMetadata: store.resetModelMetadata,
    setOnboardingCompleted: store.setOnboardingCompleted,
    resetChat: store.resetChat,
    loadConversations,
    selectConversation,
    createNewChat,
    deleteConversation,
    sendMessage,
  };
};
export default useChat;
