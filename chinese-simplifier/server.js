import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import 'dotenv/config';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

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
    console.log('[Backend] Sending response...');

    res.json({ text });
  } catch (error) {
    console.error('[Backend] Error fetching URL:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend server running on http://0.0.0.0:${PORT}`);
});
