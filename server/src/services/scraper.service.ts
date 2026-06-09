import axios from 'axios';
import * as xml2js from 'xml2js';
import * as cheerio from 'cheerio';

let puppeteer: any = null;
try {
  import('puppeteer')
    .then((m) => {
      puppeteer = m.default || m;
    })
    .catch((err) => {
      console.log('⚠️ Puppeteer is not installed. JS-rendered page scraping will fall back to Cheerio.');
    });
} catch {
  // Ignore
}

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';

export const askGroq = async (prompt: string, jsonMode: boolean = true): Promise<string> => {
  const apiKey = process.env.GROQ_API_KEY || process.env.GROQ_API;
  if (!apiKey) {
    throw new Error('Groq API Key is not configured in .env');
  }

  const body: any = {
    model: GROQ_MODEL,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0,
  };
  if (jsonMode) {
    body.response_format = { type: 'json_object' };
  }

  const response = await axios.post(GROQ_URL, body, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  return response.data.choices[0].message.content;
};

const extractJSON = (text: string): string => {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1) {
    throw new Error('No JSON found in response');
  }
  return text.slice(start, end + 1);
};

export const scraperService = {
  // Step 1: Get Top Sites via Groq
  async getSites(topic: string, count: number = 5): Promise<string[]> {
    const prompt = `
Give ONLY valid JSON. No explanation. No markdown.

Topic: ${topic}

Find the top ${count} trusted educational or reference websites for this topic.

Format:
{
  "sites": ["domain1.com", "domain2.com"]
}
`;
    const result = await askGroq(prompt, true);
    const json = JSON.parse(extractJSON(result));
    return json.sites || [];
  },

  // Step 2: Find Sitemap from robots.txt
  async getSitemapUrl(domain: string): Promise<string | null> {
    try {
      const res = await axios.get(`https://${domain}/robots.txt`, {
        timeout: 8000,
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ResearchBot/1.0)' },
      });
      const lines = res.data.split('\n');
      const line = lines.find((l: string) => l.toLowerCase().startsWith('sitemap:'));
      if (!line) return null;
      return line.replace(/sitemap:/i, '').trim();
    } catch {
      // Fallback: try common paths
      const candidates = [
        `https://${domain}/sitemap.xml`,
        `https://www.${domain}/sitemap.xml`,
        `https://${domain}/sitemap_index.xml`,
      ];
      for (const url of candidates) {
        try {
          await axios.head(url, { timeout: 5000 });
          return url;
        } catch {
          continue;
        }
      }
      return null;
    }
  },

  // Step 3: Parse Sitemap (recursive sitemapindex support)
  async parseSitemap(sitemapUrl: string, depth: number = 0): Promise<string[]> {
    if (depth > 3) return []; // Prevent infinite recursion
    try {
      const res = await axios.get(sitemapUrl, {
        timeout: 10000,
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ResearchBot/1.0)' },
      });
      const parsed = await xml2js.parseStringPromise(res.data);
      const urls: string[] = [];

      // Handle sitemap index (contains nested sitemaps)
      if (parsed.sitemapindex?.sitemap) {
        const nestedSitemaps = parsed.sitemapindex.sitemap
          .map((s: any) => s.loc?.[0])
          .filter(Boolean)
          .slice(0, 10); // Limit nested sitemaps

        for (const nested of nestedSitemaps) {
          const nestedUrls = await this.parseSitemap(nested, depth + 1);
          urls.push(...nestedUrls);
          if (urls.length > 1000) break; // Cap at 1000
        }
      }

      // Handle urlset (direct URLs)
      if (parsed.urlset?.url) {
        parsed.urlset.url.forEach((u: any) => {
          if (u.loc?.[0]) urls.push(u.loc[0]);
        });
      }

      // Deduplicate
      return [...new Set(urls)];
    } catch {
      return [];
    }
  },

  // Step 4: Filter Relevant URLs via Groq
  async getRelevantUrls(topic: string, urls: string[]): Promise<string[]> {
    if (!urls.length) return [];

    // Chunk into batches of 200 (token safety)
    const chunks: string[][] = [];
    for (let i = 0; i < urls.length; i += 200) {
      chunks.push(urls.slice(i, i + 200));
    }

    const relevant: string[] = [];
    for (const chunk of chunks) {
      const prompt = `
Give ONLY valid JSON. No explanation. No markdown.

Topic: ${topic}

From the URLs below, select ONLY those highly relevant to the topic.

Return format:
{
  "relevant": ["url1", "url2"]
}

URLs:
${chunk.join('\n')}
`;
      try {
        const result = await askGroq(prompt, true);
        const json = JSON.parse(extractJSON(result));
        relevant.push(...(json.relevant || []));
      } catch {
        // Skip bad chunk
      }
    }

    return [...new Set(relevant)];
  },

  // Step 5a: Scrape with Cheerio (fast, static pages)
  async scrapeWithCheerio(url: string) {
    try {
      const res = await axios.get(url, {
        timeout: 12000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; ResearchBot/1.0)',
          Accept: 'text/html',
        },
      });
      const $ = cheerio.load(res.data);

      // Remove noise
      $('script, style, nav, footer, header, aside, .ad, .advertisement').remove();

      const title = $('title').text().trim();
      const description = $('meta[name="description"]').attr('content') || '';

      // Extract text from meaningful tags
      const textParts: string[] = [];
      $('h1, h2, h3, h4, p, li, td, th, pre, code, blockquote').each((_, el) => {
        const text = $(el).text().replace(/\s+/g, ' ').trim();
        if (text.length > 30) textParts.push(text);
      });

      // Extract images with alt text
      const images: Array<{ src: string; alt: string }> = [];
      $('img').each((_, el) => {
        const alt = $(el).attr('alt')?.trim();
        const src = $(el).attr('src') || $(el).attr('data-src');
        if (alt && alt.length > 3 && src) {
          images.push({ src, alt });
        }
      });

      return {
        url,
        method: 'cheerio' as const,
        title,
        description,
        text: textParts.join(' ').slice(0, 8000),
        images: images.slice(0, 20),
      };
    } catch {
      return null;
    }
  },

  // Step 5b: Scrape with Puppeteer (JS-rendered pages)
  async scrapeWithPuppeteer(url: string) {
    if (!puppeteer) {
      console.log('  → Puppeteer not available, skipping JS scraping for:', url);
      return null;
    }
    let browser: any;
    try {
      browser = await puppeteer.launch({
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
        ],
      });
      const page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (compatible; ResearchBot/1.0)');
      await page.setRequestInterception(true);

      // Block unnecessary resources for speed
      page.on('request', (req: any) => {
        if (['image', 'stylesheet', 'font', 'media'].includes(req.resourceType())) {
          req.abort();
        } else {
          req.continue();
        }
      });

      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const data = await page.evaluate(() => {
        const clean = (el: any) => el?.remove();
        ['script', 'style', 'nav', 'footer', 'header', 'aside'].forEach((tag) => {
          document.querySelectorAll(tag).forEach(clean);
        });

        const title = document.title || '';
        const description =
          (document.querySelector('meta[name="description"]') as HTMLMetaElement)?.content || '';

        const textEls = document.querySelectorAll(
          'h1,h2,h3,h4,p,li,td,th,pre,code,blockquote'
        );
        const textParts: string[] = [];
        textEls.forEach((el: any) => {
          const t = el.innerText?.replace(/\s+/g, ' ').trim();
          if (t && t.length > 30) textParts.push(t);
        });

        const images: Array<{ src: string; alt: string }> = [];
        document.querySelectorAll('img').forEach((img: any) => {
          const alt = img.alt?.trim();
          const src = img.src || img.dataset.src;
          if (alt && alt.length > 3 && src) images.push({ src, alt });
        });

        return {
          title,
          description,
          text: textParts.join(' ').slice(0, 8000),
          images: images.slice(0, 20),
        };
      });

      return { url, method: 'puppeteer' as const, ...data };
    } catch {
      return null;
    } finally {
      if (browser) await browser.close();
    }
  },

  // Smart Scrape
  async scrapeUrl(url: string) {
    const cheerioResult = await this.scrapeWithCheerio(url);

    // If cheerio got meaningful content, use it
    if (cheerioResult && cheerioResult.text.length > 200) {
      return cheerioResult;
    }

    // Fallback to Puppeteer for JS-heavy pages
    console.log(`  → Puppeteer fallback for: ${url}`);
    const puppeteerResult = await this.scrapeWithPuppeteer(url);
    return puppeteerResult || cheerioResult;
  },
};
