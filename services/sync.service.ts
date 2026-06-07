import { apiService } from './api.service';
import { getQueue, QueueEntry, removeFromQueue } from './offlineQueue.service';
import { useChatStore } from '../store/chat.store';
import { Conversation, Message } from '../types/chat.types';

export interface SyncedConversation {
  localConversationId: string;
  remoteConversation: Conversation;
  remoteMessages: Message[];
}

const inFlightSyncs = new Map<string, Promise<SyncedConversation>>();

const syncQueueEntry = async (entry: QueueEntry): Promise<SyncedConversation> => {
  const existingSync = inFlightSyncs.get(entry.conversationId);
  if (existingSync) return existingSync;

  const syncPromise = (async () => {
    const remoteConversation = await apiService.createConversation(entry.conversationTitle);
    const remoteMessages: Message[] = [];

    for (const message of entry.messages) {
      const remoteMessage = await apiService.createMessage(
        remoteConversation._id,
        message.role,
        message.content
      );
      remoteMessages.push(remoteMessage);
    }

    await removeFromQueue(entry.conversationId);

    return {
      localConversationId: entry.conversationId,
      remoteConversation,
      remoteMessages,
    };
  })();

  inFlightSyncs.set(entry.conversationId, syncPromise);

  try {
    return await syncPromise;
  } finally {
    inFlightSyncs.delete(entry.conversationId);
  }
};

export const syncQueuedConversation = async (
  conversationId: string
): Promise<SyncedConversation | null> => {
  const queue = await getQueue();
  const entry = queue.find((item) => item.conversationId === conversationId);
  if (!entry) return null;

  const synced = await syncQueueEntry(entry);
  const store = useChatStore.getState();

  if (store.activeConversation?._id === conversationId) {
    store.setActiveConversation(synced.remoteConversation);
    store.setMessages(synced.remoteMessages);
  }

  store.setConversations([
    synced.remoteConversation,
    ...store.conversations.filter((conversation) => conversation._id !== conversationId),
  ]);

  return synced;
};

export const syncOfflineQueue = async (): Promise<void> => {
  const store = useChatStore.getState();

  if (store.syncing) return;
  store.setSyncing(true);

  try {
    const queue = await getQueue();

    await Promise.all(
      queue.map(async (entry) => {
        try {
          const synced = await syncQueueEntry(entry);
          const currentStore = useChatStore.getState();

          if (currentStore.activeConversation?._id === synced.localConversationId) {
            currentStore.setActiveConversation(synced.remoteConversation);
            currentStore.setMessages(synced.remoteMessages);
          }
        } catch (error) {
          console.log(`Failed to sync offline conversation ${entry.conversationId}:`, error);
        }
      })
    );

    try {
      const conversations = await apiService.fetchConversations();
      useChatStore.getState().setConversations(conversations);
    } catch (error) {
      console.log('Failed to refresh conversations after sync:', error);
    }
  } finally {
    useChatStore.getState().setSyncing(false);
  }
};
