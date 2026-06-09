import { Router, Request, Response } from 'express';
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import ResearchSession from '../models/ResearchSession.js';
import ScrapedPage from '../models/ScrapedPage.js';
import SessionChat from '../models/SessionChat.js';

const router = Router();

// GET all conversations
router.get('/conversations', async (req: Request, res: Response) => {
  try {
    const conversations = await Conversation.find().sort({ updatedAt: -1 });
    res.json(conversations);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST create a conversation
router.post('/conversations', async (req: Request, res: Response) => {
  try {
    const conversation = new Conversation({ title: 'New Conversation' });
    await conversation.save();
    res.status(201).json(conversation);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET messages for a conversation
router.get('/conversations/:id/messages', async (req: Request, res: Response) => {
  try {
    const messages = await Message.find({ conversationId: req.params.id }).sort({ createdAt: 1 });
    res.json(messages);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST post a message manually (user or assistant)
router.post('/conversations/:id/messages', async (req: Request, res: Response) => {
  try {
    const { role, content } = req.body;
    if (!role || !content) {
      return res.status(400).json({ error: 'role and content are required' });
    }

    const message = new Message({
      conversationId: req.params.id,
      role,
      content,
    });
    await message.save();

    // Update conversation updatedAt
    await Conversation.findByIdAndUpdate(req.params.id, { updatedAt: new Date() });

    res.status(201).json(message);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE a conversation and its messages
router.delete('/conversations/:id', async (req: Request, res: Response) => {
  try {
    await Message.deleteMany({ conversationId: req.params.id });
    await Conversation.findByIdAndDelete(req.params.id);
    
    // Clean up corresponding Web Research database entries if they exist
    await ResearchSession.findByIdAndDelete(req.params.id);
    await ScrapedPage.deleteMany({ sessionId: req.params.id });
    await SessionChat.deleteMany({ sessionId: req.params.id });

    res.json({ message: 'Conversation and messages deleted' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST stream Groq completion
router.post('/conversations/:id/stream', async (req: Request, res: Response) => {
  try {
    const { content } = req.body;
    if (!content) {
      return res.status(400).json({ error: 'content is required' });
    }

    const conversationId = req.params.id;

    // 1. Verify conversation exists
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // 2. Save user message
    const userMessage = new Message({
      conversationId,
      role: 'user',
      content,
    });
    await userMessage.save();

    // 3. Update conversation title if it is default
    if (conversation.title === 'New Conversation') {
      const words = content.split(/\s+/).filter(Boolean);
      const title = words.length <= 5 ? content : words.slice(0, 5).join(' ') + '...';
      conversation.title = title;
    }
    conversation.updatedAt = new Date();
    await conversation.save();

    // 4. Retrieve conversation history for context memory
    const history = await Message.find({ conversationId }).sort({ createdAt: 1 });
    
    // Convert to Groq API compatible format
    const messagesContext = history.map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    // 5. Query Groq API
    const apiKey = process.env.GROQ_API_KEY || process.env.GROQ_API;
    if (!apiKey) {
      return res.status(500).json({ error: 'Groq API Key is not configured' });
    }

    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: messagesContext,
        stream: true,
      }),
    });

    if (!groqResponse.ok || !groqResponse.body) {
      const errorText = await groqResponse.text();
      return res.status(groqResponse.status).json({ error: `Groq error: ${errorText}` });
    }

    // 6. Set response headers for SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const reader = groqResponse.body.getReader();
    const decoder = new TextDecoder();
    let assistantContent = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        res.write('data: [DONE]\n\n');
        res.end();
        break;
      }

      // Pipe the chunk to client
      res.write(value);

      // Parse the chunk to reconstruct assistant message text
      const chunkText = decoder.decode(value, { stream: true });
      buffer += chunkText;
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const cleaned = line.trim();
        if (!cleaned) continue;
        if (cleaned.startsWith('data: ')) {
          const dataStr = cleaned.slice(6);
          if (dataStr === '[DONE]') continue;
          try {
            const parsed = JSON.parse(dataStr);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              assistantContent += delta;
            }
          } catch (e) {
            // Ignore incomplete chunks json parsing errors
          }
        }
      }
    }

    // 7. Save assistant message after stream ends
    if (assistantContent.trim()) {
      const assistantMessage = new Message({
        conversationId,
        role: 'assistant',
        content: assistantContent,
      });
      await assistantMessage.save();

      // Update conversation updatedAt
      await Conversation.findByIdAndUpdate(conversationId, { updatedAt: new Date() });
    }

  } catch (err: any) {
    console.error('Streaming error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message });
    }
  }
});

export default router;
