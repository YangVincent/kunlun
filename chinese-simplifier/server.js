import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import 'dotenv/config';
import nodejieba from 'nodejieba';
import cedict from 'cc-cedict';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// CC-CEDICT is already loaded and ready to use
console.log('CC-CEDICT dictionary ready');

// Proxy endpoint for Anthropic API
app.post('/api/claude', async (req, res) => {
  try {
    const apiKey = process.env.VITE_ANTHROPIC_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: 'API key not configured' });
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(req.body)
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    res.json(data);
  } catch (error) {
    console.error('Error calling Claude API:', error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint to fetch and extract text from URL
app.post('/api/fetch-url', async (req, res) => {
  try {
    const { url } = req.body;
    console.log('[Backend] Received URL fetch request for:', url);

    if (!url) {
      console.error('[Backend] No URL provided');
      return res.status(400).json({ error: 'URL is required' });
    }

    // Fetch the URL
    console.log('[Backend] Fetching URL...');
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    console.log('[Backend] Fetch response status:', response.status);

    if (!response.ok) {
      console.error('[Backend] Failed to fetch URL:', response.statusText);
      return res.status(response.status).json({ error: `Failed to fetch URL: ${response.statusText}` });
    }

    const html = await response.text();
    console.log('[Backend] Received HTML length:', html.length);

    // Parse HTML and extract text using cheerio
    const $ = cheerio.load(html);

    // Remove script and style elements
    $('script, style, nav, header, footer, aside, iframe, .ad, .advertisement').remove();

    // Try to find main content - try multiple selectors
    let mainContent = $('article').first();
    if (mainContent.length === 0) mainContent = $('main').first();
    if (mainContent.length === 0) mainContent = $('.content').first();
    if (mainContent.length === 0) mainContent = $('.article').first();
    if (mainContent.length === 0) mainContent = $('#article').first();
    if (mainContent.length === 0) mainContent = $('body');

    console.log('[Backend] Main content selector found:', mainContent.length > 0);

    // Get all paragraph and div text
    let paragraphs = [];
    mainContent.find('p, div, h1, h2, h3, h4, h5, h6, span').each((i, elem) => {
      const text = $(elem).text().trim();
      if (text && /[\u4e00-\u9fa5]/.test(text)) {
        paragraphs.push(text);
      }
    });

    console.log('[Backend] Found paragraphs:', paragraphs.length);

    // If no paragraphs found, just get all text
    if (paragraphs.length === 0) {
      const allText = mainContent.text();
      paragraphs = allText.split(/[。！？\n]/).filter(line => {
        line = line.trim();
        return line.length > 0 && /[\u4e00-\u9fa5]/.test(line);
      });
    }

    // Join and clean up
    let text = paragraphs.join('\n\n')
      .replace(/\s+/g, ' ')  // Replace multiple spaces with single space
      .replace(/\n\s*\n\s*\n/g, '\n\n')  // Normalize double newlines
      .trim();

    console.log('[Backend] Extracted text length:', text.length);
    console.log('[Backend] First 200 chars:', text.substring(0, 200));

    // Use Claude to filter and extract only the main article content
    console.log('[Backend] Filtering content with Claude...');
    const apiKey = process.env.VITE_ANTHROPIC_API_KEY;

    if (!apiKey) {
      console.log('[Backend] No API key, skipping LLM filtering');
      return res.json({ text });
    }

    try {
      const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-5-haiku-20241022',
          max_tokens: 4096,
          messages: [{
            role: 'user',
            content: `You are extracting the main article content from a scraped web page. The text below may contain navigation menus, headers, footers, related articles, comments, advertisements, and other non-article content.

Please extract and return the article title and main article text. Remove:
- Navigation menus and links
- Website headers and footers
- Related articles or article lists
- Comments sections
- Advertisements
- Social media sharing buttons
- Author bios (unless it's part of the article)
- Any repeated or duplicate content

IMPORTANT: Keep the article title at the beginning, followed by the article content.

Return only the article title and core article content in Chinese. Preserve paragraph breaks. Do not add any explanation or English text - just return the filtered Chinese article with its title.

Text to filter:
${text}`
          }]
        })
      });

      const claudeData = await claudeResponse.json();

      if (claudeResponse.ok && claudeData.content && claudeData.content[0]) {
        const filteredText = claudeData.content[0].text.trim();
        console.log('[Backend] Filtered text length:', filteredText.length);
        console.log('[Backend] Filtered first 200 chars:', filteredText.substring(0, 200));
        console.log('[Backend] Sending filtered response...');
        res.json({ text: filteredText });
      } else {
        console.log('[Backend] Claude filtering failed, using original text');
        console.log('[Backend] Sending response...');
        res.json({ text });
      }
    } catch (claudeError) {
      console.error('[Backend] Error calling Claude for filtering:', claudeError);
      console.log('[Backend] Falling back to original text');
      console.log('[Backend] Sending response...');
      res.json({ text });
    }
  } catch (error) {
    console.error('[Backend] Error fetching URL:', error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint to segment Chinese text into phrases
app.post('/api/segment-text', async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    // Use nodejieba to segment the text
    const segments = nodejieba.cut(text);

    // Build phrase array with positions
    const phrases = [];
    let currentIndex = 0;

    for (const segment of segments) {
      const start = currentIndex;
      const end = currentIndex + segment.length;

      phrases.push({
        text: segment,
        start: start,
        end: end
      });

      currentIndex = end;
    }

    res.json({ phrases });
  } catch (error) {
    console.error('Error segmenting text:', error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint to look up definitions for Chinese phrases
app.post('/api/lookup-definitions', async (req, res) => {
  try {
    const { phrases } = req.body;

    if (!phrases || !Array.isArray(phrases)) {
      return res.status(400).json({ error: 'Phrases array is required' });
    }

    // Look up each phrase in the dictionary
    const definitions = {};

    for (const phrase of phrases) {
      // Try to find the phrase in the dictionary using getBySimplified
      // Returns object keyed by pinyin, each containing an array of entries
      const entries = cedict.getBySimplified(phrase);

      if (entries && Object.keys(entries).length > 0) {
        // Take the first pinyin variant
        const firstPinyin = Object.keys(entries)[0];
        const entryArray = entries[firstPinyin];

        if (entryArray && entryArray.length > 0) {
          const entry = entryArray[0];

          // Take only the first definition for brevity
          const firstDefinition = Array.isArray(entry.english) ? entry.english[0] : entry.english;

          definitions[phrase] = {
            pinyin: entry.pinyin || '',
            definitions: firstDefinition || 'No definition found'
          };
        } else {
          definitions[phrase] = {
            pinyin: '',
            definitions: 'No definition found'
          };
        }
      } else {
        // If not found, set a placeholder
        definitions[phrase] = {
          pinyin: '',
          definitions: 'No definition found'
        };
      }
    }

    res.json({ definitions });
  } catch (error) {
    console.error('Error looking up definitions:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend server running on http://0.0.0.0:${PORT}`);
});
