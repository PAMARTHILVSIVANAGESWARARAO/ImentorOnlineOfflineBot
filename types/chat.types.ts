export interface Message {
  _id?: string;
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string | Date;
}

export interface Conversation {
  _id: string;
  title: string;
  createdAt: string | Date;
  updatedAt: string | Date;
}
