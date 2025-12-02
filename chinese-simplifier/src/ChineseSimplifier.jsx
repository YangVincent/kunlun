import React, { useState, useEffect, useRef } from 'react';
import './ChineseSimplifier.css';
import { pinyin } from 'pinyin-pro';
import lexicon from 'chinese-lexicon';

const HSK_LEVELS = [
  { value: 1, label: 'HSK 1 (150 words)' },
  { value: 2, label: 'HSK 2 (300 words)' },
  { value: 3, label: 'HSK 3 (600 words)' },
  { value: 4, label: 'HSK 4 (1200 words)' },
  { value: 5, label: 'HSK 5 (2500 words)' },
  { value: 6, label: 'HSK 6 (5000 words)' },
];

// Sample text and its pre-cached simplified version
const SAMPLE_TEXT = {
  original: `中国经济在经历了疫情冲击后正逐步恢复，各项宏观经济指标持续改善。专家预测，随着消费市场回暖和制造业复苏，全年GDP增速有望达到预期目标。与此同时，政府也在积极推动产业升级和科技创新，以实现可持续发展。`,
  simplified: `中国经济在经过疫情的打击后，正在慢慢恢复。各种大的经济数据不断变好。专家说，因为人们买东西越来越多，工厂也开始生产更多，今年GDP的增长可能会达到我们希望的目标。同时，政府也在努力帮助产业变得更好，推动科技进步，为了让发展可以一直持续下去。`,
  annotations: [
    { "original": "经历", "simplified": "经过", "pinyin": "jīngguò", "meaning": "go through" },
    { "original": "冲击", "simplified": "打击", "pinyin": "dǎjī", "meaning": "strike, hit" },
    { "original": "逐步", "simplified": "慢慢", "pinyin": "mànman", "meaning": "slowly" },
    { "original": "各项", "simplified": "各种", "pinyin": "gèzhǒng", "meaning": "various" },
    { "original": "宏观经济指标", "simplified": "大的经济数据", "pinyin": "dà de jīngjì shùjù", "meaning": "big economic data" },
    { "original": "持续改善", "simplified": "不断变好", "pinyin": "búduàn biàn hǎo", "meaning": "continuously getting better" },
    { "original": "预测", "simplified": "说", "pinyin": "shuō", "meaning": "say" },
    { "original": "消费市场回暖", "simplified": "人们买东西越来越多", "pinyin": "rénmen mǎi dōngxi yuèláiyuè duō", "meaning": "people buying more things" },
    { "original": "制造业复苏", "simplified": "工厂也开始生产更多", "pinyin": "gōngchǎng yě kāishǐ shēngchǎn gèng duō", "meaning": "factories starting to produce more" },
    { "original": "增速", "simplified": "增长", "pinyin": "zēngzhǎng", "meaning": "growth" },
    { "original": "有望", "simplified": "可能会", "pinyin": "kěnéng huì", "meaning": "might" },
    { "original": "预期目标", "simplified": "我们希望的目标", "pinyin": "wǒmen xīwàng de mùbiāo", "meaning": "the goal we hope for" },
    { "original": "与此同时", "simplified": "同时", "pinyin": "tóngshí", "meaning": "at the same time" },
    { "original": "积极推动", "simplified": "努力帮助", "pinyin": "nǔlì bāngzhù", "meaning": "work hard to help" },
    { "original": "产业升级", "simplified": "产业变得更好", "pinyin": "chǎnyè biàn de gèng hǎo", "meaning": "industries getting better" },
    { "original": "科技创新", "simplified": "科技进步", "pinyin": "kējì jìnbù", "meaning": "technology progress" },
    { "original": "可持续发展", "simplified": "让发展可以一直持续下去", "pinyin": "ràng fāzhǎn kěyǐ yīzhí chíxù xiàqù", "meaning": "make development continue forever" }
  ]
};

export default function ChineseSimplifier() {
  const [inputText, setInputText] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [inputMode, setInputMode] = useState('url'); // 'text' or 'url'
  const [hskLevel, setHskLevel] = useState(3);
  const [simplifiedText, setSimplifiedText] = useState('');
  const [annotations, setAnnotations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showTooltips, setShowTooltips] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [activeCharIndex, setActiveCharIndex] = useState(null);

  // Close tooltip when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setActiveCharIndex(null);
    };

    if (activeCharIndex !== null) {
      document.addEventListener('click', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [activeCharIndex]);

  const fetchTextFromUrl = async () => {
    if (!urlInput.trim()) {
      setError('Please enter a URL');
      return;
    }

    console.log('[Frontend] Starting URL fetch for:', urlInput);
    setIsLoading(true);
    setError('');
    setInputText('');

    try {
      console.log('[Frontend] Sending request to backend...');
      const response = await fetch('http://137.184.55.135:3001/api/fetch-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: urlInput }),
      });

      console.log('[Frontend] Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('[Frontend] Error response:', errorData);
        throw new Error(errorData.error || 'Failed to fetch URL');
      }

      const data = await response.json();
      console.log('[Frontend] Received text length:', data.text?.length);
      console.log('[Frontend] First 200 chars:', data.text?.substring(0, 200));
      setInputText(data.text);
      setInputMode('text');
    } catch (err) {
      console.error('[Frontend] Error:', err);
      setError(`Error fetching URL: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const simplifyText = async () => {
    if (!inputText.trim()) {
      setError('Please enter some Chinese text');
      return;
    }

    setIsLoading(true);
    setError('');
    setSimplifiedText('');
    setAnnotations([]);

    const prompt = `You are a Chinese language expert. Your task is to rewrite the following Chinese text using ONLY vocabulary from HSK level ${hskLevel} or below.

RULES:
1. Preserve the original meaning as closely as possible
2. Replace difficult words/phrases with simpler HSK ${hskLevel} or lower equivalents
3. If a concept cannot be expressed with simple vocabulary, use a brief explanation using simple words
4. Keep proper nouns, numbers, and punctuation
5. Maintain the same general sentence structure where possible

After the simplified text, provide a JSON array of annotations for words that were changed. Each annotation should have:
- "original": the original word/phrase
- "simplified": what you changed it to
- "pinyin": pinyin for the simplified version
- "meaning": brief English meaning

INPUT TEXT:
${inputText}

Respond in this exact format:
SIMPLIFIED:
[Your simplified Chinese text here]

ANNOTATIONS:
[JSON array of changes]`;

    try {
      const response = await fetch('http://137.184.55.135:3001/api/claude', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 4000,
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`API request failed: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      const responseText = data.content[0].text;

      // Parse the response
      const simplifiedMatch = responseText.match(/SIMPLIFIED:\s*([\s\S]*?)(?=ANNOTATIONS:|$)/);
      const annotationsMatch = responseText.match(/ANNOTATIONS:\s*(\[[\s\S]*?\])/);

      if (simplifiedMatch) {
        const text = simplifiedMatch[1].trim();
        setSimplifiedText(text);

        // Trigger DOM mutation to help extensions re-scan
        setTimeout(() => {
          setForceUpdate(prev => prev + 1);

          // Dispatch custom event that extensions might listen for
          const event = new CustomEvent('contentUpdated', { detail: { text } });
          document.dispatchEvent(event);
        }, 100);
      }

      if (annotationsMatch) {
        try {
          const parsed = JSON.parse(annotationsMatch[1]);
          setAnnotations(parsed);
        } catch (e) {
          console.log('Could not parse annotations:', e);
        }
      }
    } catch (err) {
      setError(`Error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const addPinyinToText = async () => {
    if (!simplifiedText) return;

    setIsLoading(true);

    try {
      const response = await fetch('http://137.184.55.135:3001/api/claude', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 4000,
          messages: [{
            role: 'user',
            content: `Add pinyin for each Chinese word/character in this text. Return a JSON array where each element has:
- "text": the Chinese word/character
- "pinyin": the pinyin (e.g., "hànzì")

For non-Chinese text (punctuation, spaces, numbers), include them with empty pinyin.

Text: ${simplifiedText}

Respond with ONLY a JSON array, no other text.`
          }],
        }),
      });

      const data = await response.json();
      const pinyinArray = JSON.parse(data.content[0].text);
      setPinyinData(pinyinArray);
    } catch (err) {
      setError(`Error adding pinyin: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(simplifiedText);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      setError('Failed to copy text');
    }
  };

  // Component to render a single character with tooltip
  const ChineseChar = ({ char, index }) => {
    const [hoverActive, setHoverActive] = useState(false);

    if (!/[\u4e00-\u9fa5]/.test(char)) {
      return <span>{char}</span>;
    }

    // Get pinyin
    const charPinyin = pinyin(char, { toneType: 'symbol' });

    // Get definition from lexicon
    const results = lexicon(char);
    let definition = '';
    if (results && results.length > 0) {
      // Get first definition, limit to 50 characters
      const defs = results[0].definitions || [];
      definition = defs.slice(0, 2).join('; ');
      if (definition.length > 60) {
        definition = definition.substring(0, 60) + '...';
      }
    }

    const isActive = activeCharIndex === index || hoverActive;

    return (
      <span
        className="interactive-char"
        onMouseEnter={() => setHoverActive(true)}
        onMouseLeave={() => setHoverActive(false)}
        onTouchStart={(e) => {
          e.stopPropagation();
          setActiveCharIndex(index);
        }}
        onClick={(e) => {
          e.stopPropagation();
          setActiveCharIndex(activeCharIndex === index ? null : index);
        }}
      >
        {char}
        {isActive && showTooltips && (
          <span className="char-tooltip">
            <div className="tooltip-pinyin">{charPinyin}</div>
            {definition && <div className="tooltip-meaning">{definition}</div>}
          </span>
        )}
      </span>
    );
  };

  return (
    <div className="simplifier-container">
      {/* Decorative background elements */}
      <div className="bg-decoration"></div>
      <div className="vertical-text-decoration">漢字</div>

      <div className="content-wrapper">
        {/* Header */}
        <header className="header-section">
          <div className="title-block">
            <h1 className="main-title">
              <span className="title-chinese">简化文本</span>
              <span className="title-separator"></span>
              <span className="title-english">Text Simplifier</span>
            </h1>
            <p className="subtitle">Transform complex Chinese into HSK-level vocabulary</p>
          </div>

        </header>

        {/* Input Section */}
        <div className="card input-card">
          <div className="card-header">
            <div className="mode-selector">
              <button
                onClick={() => setInputMode('text')}
                className={`mode-btn ${inputMode === 'text' ? 'active' : ''}`}
              >
                <span className="mode-icon">文</span>
                <span>Text Input</span>
              </button>
              <button
                onClick={() => setInputMode('url')}
                className={`mode-btn ${inputMode === 'url' ? 'active' : ''}`}
              >
                <span className="mode-icon">链</span>
                <span>URL Input</span>
              </button>
            </div>

            <div className="hsk-selector">
              <label className="hsk-label">Target Level</label>
              <select
                value={hskLevel}
                onChange={(e) => setHskLevel(Number(e.target.value))}
                className="hsk-select"
              >
                {HSK_LEVELS.map((level) => (
                  <option key={level.value} value={level.value}>
                    {level.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {inputMode === 'url' ? (
            <div className="url-input-section">
              <div className="input-wrapper">
                <input
                  type="url"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://example.com/article"
                  className="url-input"
                />
              </div>
              <button
                onClick={fetchTextFromUrl}
                disabled={isLoading}
                className="primary-btn fetch-btn"
              >
                {isLoading ? (
                  <span className="btn-loading">
                    <span className="spinner"></span>
                    <span>Fetching Article...</span>
                  </span>
                ) : (
                  <span>Fetch Article Text</span>
                )}
              </button>
            </div>
          ) : (
            <div className="text-input-section">
              <div className="textarea-wrapper">
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="在这里粘贴中文文章..."
                  className="text-input"
                  rows={Math.min(Math.max(8, Math.ceil(inputText.length / 80)), 30)}
                />
                <div className="char-count">{inputText.length} characters</div>
              </div>

              <button
                onClick={simplifyText}
                disabled={isLoading}
                className="primary-btn simplify-btn"
              >
                {isLoading ? (
                  <span className="btn-loading">
                    <span className="spinner"></span>
                    <span>Processing...</span>
                  </span>
                ) : (
                  <span>Simplify to HSK {hskLevel}</span>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="error-banner">
            <span className="error-icon">⚠</span>
            <span>{error}</span>
          </div>
        )}

        {/* Output Section */}
        {simplifiedText && (
          <div className="card output-card">
            <div className="card-header">
              <h2 className="card-title">
                <span className="title-icon">✦</span>
                Simplified Version (HSK {hskLevel})
              </h2>
              <div className="action-buttons">
                <button
                  onClick={() => setShowTooltips(!showTooltips)}
                  className="secondary-btn"
                >
                  {showTooltips ? 'Hide Tooltips' : 'Show Tooltips'}
                </button>
                <button
                  onClick={handleCopyText}
                  className={`secondary-btn ${copySuccess ? 'copy-success' : ''}`}
                >
                  {copySuccess ? '✓ Copied!' : 'Copy Text'}
                </button>
              </div>
            </div>

            <div className="output-text">
              {showTooltips ? (
                <div className="tooltip-mode">
                  {simplifiedText.split('').map((char, idx) => (
                    <ChineseChar key={idx} char={char} index={idx} />
                  ))}
                </div>
              ) : (
                <span>{simplifiedText}</span>
              )}
            </div>
          </div>
        )}

        {/* Annotations Section */}
        {annotations.length > 0 && (
          <div className="card annotations-card">
            <h2 className="card-title">
              <span className="title-icon">◆</span>
              Vocabulary Changes
            </h2>
            <div className="annotations-grid">
              {annotations.map((ann, idx) => (
                <div key={idx} className="annotation-item" style={{ animationDelay: `${idx * 0.05}s` }}>
                  <div className="annotation-change">
                    <span className="original-word">{ann.original}</span>
                    <span className="arrow">→</span>
                    <span className="simplified-word">{ann.simplified}</span>
                  </div>
                  <div className="annotation-details">
                    <span className="pinyin">{ann.pinyin}</span>
                    {ann.meaning && <span className="meaning">{ann.meaning}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sample Text Button */}
        {!inputText && (
          <div className="sample-text-section">
            <button
              onClick={() => {
                setInputText(SAMPLE_TEXT.original);
                setSimplifiedText(SAMPLE_TEXT.simplified);
                setAnnotations(SAMPLE_TEXT.annotations);
              }}
              className="sample-btn"
            >
              Load sample text to try
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
