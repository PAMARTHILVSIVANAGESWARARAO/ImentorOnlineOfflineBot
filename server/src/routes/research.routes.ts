import { Router, Request, Response } from 'express';
import ResearchSession from '../models/ResearchSession.js';
import ScrapedPage from '../models/ScrapedPage.js';
import SessionChat from '../models/SessionChat.js';
import Conversation from '../models/Conversation.js';
import { scraperService } from '../services/scraper.service.js';
import axios from 'axios';

const router = Router();

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';

/**
 * POST /research
 * Body: { "topic": "OOPS in Java", "count": 5 }
 *
 * Discovers top sites, finds sitemaps, filters relevant URLs,
 * scrapes them, stores everything in MongoDB.
 * Returns sessionId for follow-up chat.
 */
router.post('/research', async (req: Request, res: Response) => {
  try {
    const { topic, count = 5 } = req.body;
    if (!topic) {
      return res.status(400).json({ error: 'topic is required' });
    }

    console.log(`\n[Research] Topic: "${topic}", Count: ${count}`);

    // 1. Get top sites
    console.log('Step 1: Getting top sites...');
    const sites = await scraperService.getSites(topic, count);
    console.log('Sites:', sites);

    // 2. Discover sitemaps
    console.log('Step 2: Discovering sitemaps...');
    let allUrls: string[] = [];
    for (const site of sites) {
      console.log(` → ${site}`);
      const sitemapUrl = await scraperService.getSitemapUrl(site);
      console.log(`   Sitemap: ${sitemapUrl}`);
      if (!sitemapUrl) continue;
      const urls = await scraperService.parseSitemap(sitemapUrl);
      console.log(`   URLs found: ${urls.length}`);
      allUrls.push(...urls);
    }
    allUrls = [...new Set(allUrls)];
    console.log(`Total unique URLs: ${allUrls.length}`);

    // 3. Filter relevant URLs
    console.log('Step 3: Filtering relevant URLs...');
    const relevantUrls = await scraperService.getRelevantUrls(topic, allUrls.slice(0, 500));
    console.log(`Relevant URLs: ${relevantUrls.length}`);

    // 4. Save session to MongoDB
    const session = new ResearchSession({
      topic,
      sites,
      inputUrls: allUrls,
      relevantUrls,
    });
    await session.save();
    const sessionId = session._id.toString();

    // Create standard Conversation record for the history tab list
    const conversation = new Conversation({
      _id: session._id,
      title: `🔍 Research: ${topic}`,
    });
    await conversation.save();

    // 5. Scrape relevant URLs (up to 20 to be safe)
    console.log('Step 4: Scraping pages...');
    const toScrape = relevantUrls.slice(0, 20);
    const scrapedPages: any[] = [];

    for (const url of toScrape) {
      console.log(` → Scraping: ${url}`);
      const page = await scraperService.scrapeUrl(url);
      if (page && page.text.length > 100) {
        scrapedPages.push({
          sessionId,
          url: page.url,
          method: page.method,
          title: page.title,
          description: page.description,
          text: page.text,
          images: page.images,
        });
      }
    }
    console.log(`Scraped: ${scrapedPages.length} pages`);

    // 6. Save scraped pages
    if (scrapedPages.length > 0) {
      await ScrapedPage.insertMany(scrapedPages);
    }

    res.json({
      sessionId,
      topic,
      websites: sites,
      totalUrlsFound: allUrls.length,
      relevantUrlsFound: relevantUrls.length,
      pagesScrapped: scrapedPages.length,
      relevantUrls,
      message: `Research complete. Use POST /chat with sessionId "${sessionId}" to ask questions.`,
    });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /chat
 * POST /research/chat
 * Body: { "sessionId": "...", "message": "What is polymorphism?" }
 *
 * Answers questions using ONLY the scraped data for that session.
 */
const handleSessionChat = async (req: Request, res: Response) => {
  try {
    const { sessionId, message } = req.body;
    if (!sessionId || !message) {
      return res.status(400).json({ error: 'sessionId and message are required' });
    }

    // Load scraped context
    const pages = await ScrapedPage.find({ sessionId }).select('url title text');
    if (!pages.length) {
      return res.status(404).json({ error: 'No scraped data found for this session. Run /research first.' });
    }

    // Load chat history
    const history = await SessionChat.find({ sessionId }).sort({ timestamp: 1 });

    // Build context from scraped pages using keyword relevance scoring
    const searchWords = message.toLowerCase().split(/\s+/).filter((w: string) => w.length > 3);
    const scoredPages = pages.map((p) => {
      let score = 0;
      const titleLower = p.title ? p.title.toLowerCase() : '';
      const textLower = p.text ? p.text.toLowerCase() : '';
      for (const word of searchWords) {
        if (titleLower.includes(word)) score += 10;
        try {
          const escapedWord = word.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
          const matches = textLower.match(new RegExp(escapedWord, 'g'));
          if (matches) score += matches.length;
        } catch (e) {
          // Fallback if regex generation fails
          if (textLower.includes(word)) score += 1;
        }
      }
      return { page: p, score };
    });

    // Sort by relevance score descending
    scoredPages.sort((a, b) => b.score - a.score);

    // Take the top 5 most relevant pages and truncate their content to 1200 characters
    const context = scoredPages
      .slice(0, 5)
      .map((sp) => `--- Source: ${sp.page.url} | Title: ${sp.page.title} ---\n${sp.page.text ? sp.page.text.slice(0, 1200) : ''}`)
      .join('\n\n');

    // Build conversation history for multi-turn
    const historyMessages = history.map((h) => ({
      role: h.role,
      content: h.content,
    }));

    // System prompt
    const systemPrompt = `You are a research assistant. Answer questions ONLY using the provided research context below. 
If the answer is not found in the context, "Explain and Answer The question In detail" using your own knowledge. Do not make up information. Always base your answer on the context when possible.

RESEARCH CONTEXT:
${context}`;

    // Save user message
    const userChat = new SessionChat({
      sessionId,
      role: 'user',
      content: message,
    });
    await userChat.save();

    // Call Groq with full conversation
    const apiKey = process.env.GROQ_API_KEY || process.env.GROQ_API;
    if (!apiKey) {
      return res.status(500).json({ error: 'Groq API Key is not configured' });
    }

    const response = await axios.post(
      GROQ_URL,
      {
        model: GROQ_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          ...historyMessages,
          { role: 'user', content: message },
        ],
        temperature: 0.3,
        max_tokens: 1000,
      },
      {
        headers: { Authorization: `Bearer ${apiKey}` },
      }
    );

    const answer = response.data.choices[0].message.content;

    // Save assistant reply
    const assistantChat = new SessionChat({
      sessionId,
      role: 'assistant',
      content: answer,
    });
    await assistantChat.save();

    // Update standard Conversation record's updatedAt timestamp
    await Conversation.findByIdAndUpdate(sessionId, { updatedAt: new Date() });

    res.json({ sessionId, question: message, answer });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

router.post('/chat', handleSessionChat);
router.post('/research/chat', handleSessionChat);

/**
 * GET /sessions
 * List all research sessions
 */
router.get('/sessions', async (req: Request, res: Response) => {
  try {
    const sessions = await ResearchSession.find()
      .select('topic sites createdAt relevantUrls')
      .sort({ createdAt: -1 });
    res.json(sessions);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /sessions/:sessionId
 * Get details of a specific session
 */
router.get('/sessions/:sessionId', async (req: Request, res: Response) => {
  try {
    const session = await ResearchSession.findById(req.params.sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const pages = await ScrapedPage.find({ sessionId: req.params.sessionId });
    const chats = await SessionChat.find({ sessionId: req.params.sessionId }).sort({ timestamp: 1 });

    res.json({ session, pages, chats });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /chat/:sessionId/history
 * Get full chat history for a session
 */
router.get('/chat/:sessionId/history', async (req: Request, res: Response) => {
  try {
    const history = await SessionChat.find({ sessionId: req.params.sessionId }).sort({ timestamp: 1 });
    res.json(history);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
