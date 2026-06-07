import { Platform } from 'react-native';
import { Conversation, Message } from '../types/chat.types';

// For real devices: use adb reverse tcp:5000 tcp:5000, then localhost works.
// For emulators: 10.0.2.2 maps to host machine.
// For web: localhost works directly.
const getApiUrl = (): string => {
  if (Platform.OS === 'web') {
    return 'http://localhost:5000/api';
  }
  // Works for both real devices (with adb reverse) and emulators
  return 'http://localhost:5000/api';
};

export const API_BASE_URL = getApiUrl();

export const apiService = {
  async fetchConversations(): Promise<Conversation[]> {
    const response = await fetch(`${API_BASE_URL}/conversations`);
    if (!response.ok) throw new Error(`Failed to fetch conversations: ${response.statusText}`);
    return response.json();
  },

  async createConversation(title?: string): Promise<Conversation> {
    const response = await fetch(`${API_BASE_URL}/conversations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: title ? JSON.stringify({ title }) : undefined,
    });
    if (!response.ok) throw new Error(`Failed to create conversation: ${response.statusText}`);
    return response.json();
  },

  async createMessage(
    conversationId: string,
    role: 'user' | 'assistant',
    content: string
  ): Promise<Message> {
    const response = await fetch(`${API_BASE_URL}/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role, content }),
    });
    if (!response.ok) throw new Error(`Failed to create message: ${response.statusText}`);
    return response.json();
  },

  async fetchMessages(conversationId: string): Promise<Message[]> {
    const response = await fetch(`${API_BASE_URL}/conversations/${conversationId}/messages`);
    if (!response.ok) throw new Error(`Failed to fetch messages: ${response.statusText}`);
    return response.json();
  },

  async deleteConversation(conversationId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/conversations/${conversationId}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error(`Failed to delete conversation: ${response.statusText}`);
  },

  getStreamUrl(conversationId: string): string {
    return `${API_BASE_URL}/conversations/${conversationId}/stream`;
  },
};
