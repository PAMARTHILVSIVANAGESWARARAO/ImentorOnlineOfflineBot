import { fetch as expoFetch } from 'expo/fetch';
import { apiService } from './api.service';
import { useChatStore } from '../store/chat.store';

export const streamService = {
  async sendMessageStream(conversationId: string, content: string): Promise<void> {
    const store = useChatStore.getState();

    store.setThinking(true);
    store.setStreaming(true);
    store.setStreamingText('');

    // Add user message to UI immediately
    store.addMessage({
      conversationId,
      role: 'user',
      content,
      createdAt: new Date(),
    });

    try {
      const streamUrl = apiService.getStreamUrl(conversationId);

      // Use expo/fetch which supports ReadableStream on React Native
      const response = await expoFetch(streamUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
        },
        body: JSON.stringify({ content }),
      });

      if (!response.ok) {
        const errBody = await response.text();
        throw new Error(`Server error ${response.status}: ${errBody}`);
      }

      if (!response.body) {
        throw new Error('Response body is not readable');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let assistantText = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // Turn off thinking indicator once first data arrives
        if (useChatStore.getState().isThinking) {
          store.setThinking(false);
        }

        const chunkText = decoder.decode(value, { stream: true });
        buffer += chunkText;

        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const cleaned = line.trim();
          if (!cleaned) continue;

          if (cleaned.startsWith('data: ')) {
            const dataStr = cleaned.slice(6);
            if (dataStr === '[DONE]') break;

            try {
              const parsed = JSON.parse(dataStr);
              const delta = parsed.choices?.[0]?.delta?.content;
              if (delta) {
                assistantText += delta;
                store.setStreamingText(assistantText);
              }
            } catch {
              // Ignore incomplete JSON chunks
            }
          }
        }
      }

      // Stream complete
      store.setStreaming(false);
      store.setThinking(false);

      store.addMessage({
        conversationId,
        role: 'assistant',
        content: assistantText,
        createdAt: new Date(),
      });
      store.setStreamingText('');

      // Refresh conversation list for updated titles
      try {
        const updated = await apiService.fetchConversations();
        store.setConversations(updated);
        const active = updated.find((c) => c._id === conversationId);
        if (active) store.setActiveConversation(active);
      } catch {
        // Non-critical failure
      }
    } catch (error: any) {
      console.error('Streaming error:', error);
      store.setThinking(false);
      store.setStreaming(false);
      store.setStreamingText('');

      store.addMessage({
        conversationId,
        role: 'assistant',
        content: `⚠️ Connection Error: ${error.message || 'Could not reach the server. Make sure the backend is running and adb reverse is set up.'}`,
        createdAt: new Date(),
      });
    }
  },
};
export default streamService;
