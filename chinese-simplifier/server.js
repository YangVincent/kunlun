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
    const phrasesNotFound = [];

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
          phrasesNotFound.push(phrase);
        }
      } else {
        // If not found in CC-CEDICT, add to list for Claude lookup
        phrasesNotFound.push(phrase);
      }
    }

    // Use Claude as fallback for phrases not found in CC-CEDICT
    if (phrasesNotFound.length > 0) {
      console.log(`[Backend] ${phrasesNotFound.length} phrases not found in CC-CEDICT, using Claude for definitions...`);

      const apiKey = process.env.VITE_ANTHROPIC_API_KEY;

      if (apiKey) {
        try {
          // Create numbered list for Claude
          const numberedPhrases = phrasesNotFound.map((p, i) => `${i + 1}. ${p}`).join('\n');

          const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': apiKey,
              'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
              model: 'claude-3-5-haiku-20241022',
              max_tokens: 2000,
              messages: [{
                role: 'user',
                content: `For each Chinese phrase below, provide a concise English definition (5-10 words max). Return ONLY the definitions, one per line, in the same numbered order:

${numberedPhrases}

Return format:
1. definition for first phrase
2. definition for second phrase
etc.`
              }]
            })
          });

          if (claudeResponse.ok) {
            const claudeData = await claudeResponse.json();
            const responseText = claudeData.content[0].text;
            const lines = responseText.trim().split('\n').filter(line => line.trim());

            // Parse Claude's numbered definitions
            phrasesNotFound.forEach((phrase, idx) => {
              const definitionLine = lines.find(line => {
                const match = line.match(/^(\d+)\.\s*(.+)/);
                return match && parseInt(match[1]) === idx + 1;
              });

              if (definitionLine) {
                const match = definitionLine.match(/^\d+\.\s*(.+)/);
                if (match) {
                  definitions[phrase] = {
                    pinyin: '',
                    definitions: match[1].trim()
                  };
                  console.log(`[Backend] Claude definition for "${phrase}": ${match[1].trim()}`);
                } else {
                  definitions[phrase] = {
                    pinyin: '',
                    definitions: 'No definition found'
                  };
                }
              } else {
                definitions[phrase] = {
                  pinyin: '',
                  definitions: 'No definition found'
                };
              }
            });
          } else {
            console.error('[Backend] Claude API error:', claudeResponse.status);
            // Set fallback for phrases not found
            phrasesNotFound.forEach(phrase => {
              definitions[phrase] = {
                pinyin: '',
                definitions: 'No definition found'
              };
            });
          }
        } catch (claudeError) {
          console.error('[Backend] Error calling Claude for definitions:', claudeError);
          // Set fallback for phrases not found
          phrasesNotFound.forEach(phrase => {
            definitions[phrase] = {
              pinyin: '',
              definitions: 'No definition found'
            };
          });
        }
      } else {
        // No API key, set fallback
        phrasesNotFound.forEach(phrase => {
          definitions[phrase] = {
            pinyin: '',
            definitions: 'No definition found'
          };
        });
      }
    }

    res.json({ definitions });
  } catch (error) {
    console.error('Error looking up definitions:', error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint to fetch news articles from Chinese news sites
app.post('/api/fetch-news', async (req, res) => {
  try {
    const { sources } = req.body;
    console.log('[Backend] Fetching news from sources:', sources);

    const allArticles = [];

    for (const source of sources) {
      try {
        console.log(`[Backend] Fetching from ${source.name}:`, source.url);
        const response = await fetch(source.url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });

        if (!response.ok) {
          console.error(`[Backend] Failed to fetch ${source.name}:`, response.statusText);
          continue;
        }

        const html = await response.text();
        const $ = cheerio.load(html);

        // Extract articles based on the source
        let articles = [];

        if (source.name === 'Caixin') {
          // Caixin-specific selectors
          $('article, .news-item, .article-item, a[href*="/"]').each((i, elem) => {
            const $elem = $(elem);
            const title = $elem.find('h1, h2, h3, h4, .title').text().trim() || $elem.text().trim();
            const url = $elem.attr('href') || $elem.find('a').attr('href');
            const description = $elem.find('p, .description, .summary').first().text().trim();

            if (title && /[\u4e00-\u9fa5]/.test(title) && title.length > 5 && title.length < 200) {
              const fullUrl = url && url.startsWith('http') ? url : (url ? `https://www.caixin.com${url}` : null);
              if (fullUrl && !allArticles.some(a => a.title === title)) {
                articles.push({
                  source: source.name,
                  title,
                  url: fullUrl,
                  description: description || null
                });
              }
            }
          });
        } else if (source.name === 'BBC Chinese') {
          // BBC Chinese-specific selectors
          $('article, .bbc-uk8dsi, [data-testid="card-headline"]').each((i, elem) => {
            const $elem = $(elem);
            const title = $elem.find('h2, h3, [data-testid="card-headline"]').text().trim() || $elem.text().trim();
            const url = $elem.find('a').attr('href') || $elem.attr('href');
            const description = $elem.find('p').first().text().trim();

            if (title && /[\u4e00-\u9fa5]/.test(title) && title.length > 5 && title.length < 200) {
              const fullUrl = url && url.startsWith('http') ? url : (url ? `https://www.bbc.com${url}` : null);
              if (fullUrl && !allArticles.some(a => a.title === title)) {
                articles.push({
                  source: source.name,
                  title,
                  url: fullUrl,
                  description: description || null
                });
              }
            }
          });
        }

        console.log(`[Backend] Found ${articles.length} articles from ${source.name}`);
        allArticles.push(...articles.slice(0, 10)); // Limit to 10 articles per source
      } catch (sourceError) {
        console.error(`[Backend] Error fetching from ${source.name}:`, sourceError.message);
      }
    }

    console.log(`[Backend] Total articles found: ${allArticles.length}`);

    // Add translations and pinyin to articles
    const apiKey = process.env.VITE_ANTHROPIC_API_KEY;
    if (apiKey && allArticles.length > 0) {
      try {
        console.log('[Backend] Adding translations and pinyin to articles...');

        // Prepare titles for batch translation with numbered list for clarity
        const numberedTitles = allArticles.map((a, i) => `${i + 1}. ${a.title}`).join('\n');

        const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: 'claude-3-5-haiku-20241022',
            max_tokens: 2000,
            messages: [{
              role: 'user',
              content: `Translate each of these Chinese news article titles to English. Return ONLY the English translations, one per line, in the same numbered format (e.g., "1. Translation here"). Do not add any explanations or extra text.

Chinese Titles:
${numberedTitles}`
            }]
          })
        });

        if (claudeResponse.ok) {
          const claudeData = await claudeResponse.json();
          const responseText = claudeData.content[0].text.trim();
          console.log('[Backend] Translation response:', responseText.substring(0, 200));

          // Parse numbered translations
          const lines = responseText.split('\n').filter(line => line.trim());

          // Add translations to articles
          allArticles.forEach((article, idx) => {
            // Try to find translation by number
            const translationLine = lines.find(line => {
              const match = line.match(/^(\d+)\.\s*(.+)/);
              return match && parseInt(match[1]) === idx + 1;
            });

            if (translationLine) {
              const match = translationLine.match(/^\d+\.\s*(.+)/);
              if (match) {
                article.translation = match[1].trim();
              }
            }
          });

          const translatedCount = allArticles.filter(a => a.translation).length;
          console.log(`[Backend] Translations added: ${translatedCount}/${allArticles.length}`);
        }
      } catch (translationError) {
        console.error('[Backend] Error adding translations:', translationError.message);
      }
    }

    res.json({ articles: allArticles });
  } catch (error) {
    console.error('[Backend] Error fetching news:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend server running on http://0.0.0.0:${PORT}`);
});
