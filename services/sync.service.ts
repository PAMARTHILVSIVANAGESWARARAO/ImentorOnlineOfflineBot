import { apiService } from './api.service';
import { getQueue, removeFromQueue } from './offlineQueue.service';
import { useChatStore } from '../store/chat.store';

export const syncOfflineQueue = async (): Promise<void> => {
  const store = useChatStore.getState();

  if (store.syncing) return;

  store.setSyncing(true);
  try {
    const queue = await getQueue();

    await Promise.all(
      queue.map(async (entry) => {
        try {
          const remoteConversation = await apiService.createConversation(entry.conversationTitle);

          for (const message of entry.messages) {
            await apiService.createMessage(remoteConversation._id, message.role, message.content);
          }

          await removeFromQueue(entry.conversationId);
        } catch (error) {
          console.error(`Failed to sync offline conversation ${entry.conversationId}:`, error);
        }
      })
    );

    try {
      const conversations = await apiService.fetchConversations();
      useChatStore.getState().setConversations(conversations);
    } catch (error) {
      console.error('Failed to refresh conversations after sync:', error);
    }
  } finally {
    useChatStore.getState().setSyncing(false);
  }
};
