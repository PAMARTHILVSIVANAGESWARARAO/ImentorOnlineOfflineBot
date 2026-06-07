import { useChatStore } from '../store/chat.store';
import { apiService } from '../services/api.service';
import { streamService } from '../services/stream.service';
import { Conversation, Message } from '../types/chat.types';

export const useChat = () => {
  const store = useChatStore();
  
  const loadConversations = async () => {
    try {
      const convs = await apiService.fetchConversations();
      store.setConversations(convs);
    } catch (err) {
      console.error('Failed to load conversations:', err);
    }
  };

  const selectConversation = async (conversation: Conversation) => {
    try {
      store.setActiveConversation(conversation);
      const msgs = await apiService.fetchMessages(conversation._id);
      store.setMessages(msgs);
    } catch (err) {
      console.error('Failed to load messages for conversation:', err);
    }
  };

  const createNewChat = async (): Promise<Conversation | null> => {
    try {
      const conv = await apiService.createConversation();
      await loadConversations();
      await selectConversation(conv);
      return conv;
    } catch (err) {
      console.error('Failed to create new conversation:', err);
      return null;
    }
  };

  const deleteConversation = async (id: string) => {
    try {
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

    if (store.isConnected) {
      // Online mode: Stream response
      await streamService.sendMessageStream(conversation._id, content);
    } else {
      // Offline mode: Render offline messages locally without calling server
      const conversationId = conversation._id;
      
      // 1. Add user message
      store.addMessage({
        conversationId,
        role: 'user',
        content,
        createdAt: new Date(),
      });

      // 2. Set thinking state to simulate offline processing/failure
      store.setThinking(true);
      
      setTimeout(() => {
        store.setThinking(false);
        const replyContent = store.offlineModelReady
          ? 'Offline model is ready to use.'
          : 'Network error. No offline model available.';
          
        store.addMessage({
          conversationId,
          role: 'assistant',
          content: replyContent,
          createdAt: new Date(),
        });
      }, 1000);
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
    setOfflineModelReady: store.setOfflineModelReady,
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
