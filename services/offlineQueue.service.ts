import AsyncStorage from '@react-native-async-storage/async-storage';

const OFFLINE_QUEUE_KEY = '@offline_message_queue';

export interface QueueMessage {
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

export interface QueueEntry {
  conversationId: string;
  conversationTitle: string;
  messages: QueueMessage[];
}

export const getQueue = async (): Promise<QueueEntry[]> => {
  const raw = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const queueConversation = async (entry: QueueEntry): Promise<void> => {
  const queue = await getQueue();
  const existingIndex = queue.findIndex((item) => item.conversationId === entry.conversationId);

  if (existingIndex >= 0) {
    queue[existingIndex] = {
      ...queue[existingIndex],
      conversationTitle: entry.conversationTitle || queue[existingIndex].conversationTitle,
      messages: [...queue[existingIndex].messages, ...entry.messages],
    };
  } else {
    queue.push(entry);
  }

  await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
};

export const clearQueue = async (): Promise<void> => {
  await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify([]));
};

export const removeFromQueue = async (conversationId: string): Promise<void> => {
  const queue = await getQueue();
  await AsyncStorage.setItem(
    OFFLINE_QUEUE_KEY,
    JSON.stringify(queue.filter((entry) => entry.conversationId !== conversationId))
  );
};
