import React, { useState, useEffect, useRef } from 'react';
import { pinyin } from 'pinyin-pro';

/**
 * Unified component for displaying Chinese text with interactive features
 * Supports three display modes: none (plain), pinyin, and tooltips
 */
export function ChineseTextDisplay({
  text,
  phrases = null,
  phraseTranslations = {},
  displayMode = 'tooltips',
  uniqueId = 'default',
  onWordHighlight = null
}) {
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

  // Helper function to split text into sentences
  const splitIntoSentences = (text) => {
    // Split by common Chinese sentence endings and punctuation
    const sentenceRegex = /([^。！？.!?\n]+[。！？.!?\n]|[^。！？.!?\n]+$)/g;
    const sentences = text.match(sentenceRegex) || [text];
    return sentences.filter(s => s.trim().length > 0);
  };

  // Helper function to render text with pinyin above characters
  const renderTextWithPinyin = (text) => {
    return text.split('').map((char, idx) => {
      if (char === '\n') {
        return <br key={idx} />;
      }
      if (/[\u4e00-\u9fa5]/.test(char)) {
        const charPinyin = pinyin(char, { toneType: 'symbol', type: 'array' })[0];
        return (
          <ruby key={idx}>
            {char}
            <rt>{charPinyin}</rt>
          </ruby>
        );
      }
      return <span key={idx}>{char}</span>;
    });
  };

  // Component to render a phrase with tooltip
  const ChinesePhrase = ({ phrase, index, showPinyin = true, showPinyinAbove = false, onHighlight = null }) => {
    const [hoverActive, setHoverActive] = useState(false);
    const [tooltipStyle, setTooltipStyle] = useState({ opacity: 0 });
    const spanRef = useRef(null);
    const tooltipRef = useRef(null);

    // Handle newlines in non-Chinese text
    if (!/[\u4e00-\u9fa5]/.test(phrase.text)) {
      if (phrase.text === '\n') {
        return <br />;
      }
      return <span>{phrase.text}</span>;
    }

    const phrasePinyin = pinyin(phrase.text, { toneType: 'symbol' });
    const translation = phraseTranslations[phrase.text] || 'Loading...';
    const uniqueIndex = `${uniqueId}-${index}`;
    const isActive = activeCharIndex === uniqueIndex || hoverActive;

    useEffect(() => {
      if (isActive && spanRef.current && tooltipRef.current) {
        const wordRect = spanRef.current.getBoundingClientRect();
        const tooltipRect = tooltipRef.current.getBoundingClientRect();

        const margin = 10;
        const tooltipWidth = tooltipRect.width;
        const wordCenterOffset = wordRect.width / 2;

        let leftOffset = -(tooltipWidth / 2) + wordCenterOffset;

        const tooltipLeft = wordRect.left + leftOffset;
        if (tooltipLeft < margin) {
          leftOffset += (margin - tooltipLeft);
        }

        const tooltipRight = wordRect.left + leftOffset + tooltipWidth;
        if (tooltipRight > window.innerWidth - margin) {
          leftOffset -= (tooltipRight - (window.innerWidth - margin));
        }

        const arrowLeft = wordCenterOffset - leftOffset;

        setTooltipStyle({
          left: `${leftOffset}px`,
          opacity: 1,
          '--arrow-left': `${arrowLeft}px`
        });
      } else {
        setTooltipStyle({ opacity: 0 });
      }
    }, [isActive, translation]);

    // If we need to show pinyin above characters (translation mode)
    if (showPinyinAbove) {
      return (
        <span
          ref={spanRef}
          className="interactive-char"
          onMouseEnter={() => setHoverActive(true)}
          onMouseLeave={() => setHoverActive(false)}
          onTouchStart={(e) => {
            e.stopPropagation();
            setActiveCharIndex(uniqueIndex);
          }}
          onClick={(e) => {
            e.stopPropagation();
            const wasActive = activeCharIndex === uniqueIndex;
            setActiveCharIndex(wasActive ? null : uniqueIndex);
            // Call highlight callback when opening tooltip (not closing)
            if (!wasActive && onHighlight) {
              onHighlight(phrase.text, phrasePinyin, translation);
            }
          }}
        >
          {phrase.text.split('').map((char, idx) => {
            if (!/[\u4e00-\u9fa5]/.test(char)) {
              return <span key={idx}>{char}</span>;
            }
            const charPinyin = pinyin(char, { toneType: 'symbol', type: 'array' })[0];
            return (
              <ruby key={idx}>
                {char}
                <rt>{charPinyin}</rt>
              </ruby>
            );
          })}
          {isActive && displayMode === 'translation' && (
            <span ref={tooltipRef} className="char-tooltip" style={tooltipStyle}>
              <div className="tooltip-translation">{translation}</div>
            </span>
          )}
        </span>
      );
    }

    return (
      <span
        ref={spanRef}
        className="interactive-char"
        onMouseEnter={() => setHoverActive(true)}
        onMouseLeave={() => setHoverActive(false)}
        onTouchStart={(e) => {
          e.stopPropagation();
          setActiveCharIndex(uniqueIndex);
        }}
        onClick={(e) => {
          e.stopPropagation();
          const wasActive = activeCharIndex === uniqueIndex;
          setActiveCharIndex(wasActive ? null : uniqueIndex);
          // Call highlight callback when opening tooltip (not closing)
          if (!wasActive && onHighlight) {
            onHighlight(phrase.text, phrasePinyin, translation);
          }
        }}
      >
        {phrase.text}
        {isActive && (displayMode === 'tooltips' || displayMode === 'translation') && (
          <span ref={tooltipRef} className="char-tooltip" style={tooltipStyle}>
            {showPinyin && <div className="tooltip-pinyin">{phrasePinyin}</div>}
            <div className="tooltip-translation">{translation}</div>
          </span>
        )}
      </span>
    );
  };

  // Component to render a single character with tooltip (fallback)
  const ChineseChar = ({ char, index }) => {
    const [hoverActive, setHoverActive] = useState(false);
    const [tooltipStyle, setTooltipStyle] = useState({ opacity: 0 });
    const spanRef = useRef(null);
    const tooltipRef = useRef(null);

    if (char === '\n') {
      return <br />;
    }

    if (!/[\u4e00-\u9fa5]/.test(char)) {
      return <span>{char}</span>;
    }

    const charPinyin = pinyin(char, { toneType: 'symbol' });
    const uniqueIndex = `${uniqueId}-char-${index}`;
    const isActive = activeCharIndex === uniqueIndex || hoverActive;

    useEffect(() => {
      if (isActive && spanRef.current && tooltipRef.current) {
        const wordRect = spanRef.current.getBoundingClientRect();
        const tooltipRect = tooltipRef.current.getBoundingClientRect();

        const margin = 10;
        const tooltipWidth = tooltipRect.width;
        const wordCenterOffset = wordRect.width / 2;

        let leftOffset = -(tooltipWidth / 2) + wordCenterOffset;

        const tooltipLeft = wordRect.left + leftOffset;
        if (tooltipLeft < margin) {
          leftOffset += (margin - tooltipLeft);
        }

        const tooltipRight = wordRect.left + leftOffset + tooltipWidth;
        if (tooltipRight > window.innerWidth - margin) {
          leftOffset -= (tooltipRight - (window.innerWidth - margin));
        }

        const arrowLeft = wordCenterOffset - leftOffset;

        setTooltipStyle({
          left: `${leftOffset}px`,
          opacity: 1,
          '--arrow-left': `${arrowLeft}px`
        });
      } else {
        setTooltipStyle({ opacity: 0 });
      }
    }, [isActive]);

    return (
      <span
        ref={spanRef}
        className="interactive-char"
        onMouseEnter={() => setHoverActive(true)}
        onMouseLeave={() => setHoverActive(false)}
        onTouchStart={(e) => {
          e.stopPropagation();
          setActiveCharIndex(uniqueIndex);
        }}
        onClick={(e) => {
          e.stopPropagation();
          setActiveCharIndex(activeCharIndex === uniqueIndex ? null : uniqueIndex);
        }}
      >
        {char}
        {isActive && displayMode === 'tooltips' && (
          <span ref={tooltipRef} className="char-tooltip" style={tooltipStyle}>
            <div className="tooltip-pinyin">{charPinyin}</div>
          </span>
        )}
      </span>
    );
  };

  // Render based on display mode
  if (displayMode === 'translation') {
    const sentences = splitIntoSentences(text);

    return (
      <div className="translation-mode">
        {sentences.map((sentence, sentenceIdx) => {
          // Get translation for this sentence from phraseTranslations
          const translation = phraseTranslations[sentence.trim()] || 'Translating...';

          // If we have phrases, use them for tooltips, otherwise fall back to character-by-character
          if (phrases && phrases.length > 0) {
            // Find the phrases that belong to this sentence
            const sentencePhrases = [];
            let currentPos = 0;

            // Find where this sentence starts in the original text
            const sentenceStart = text.indexOf(sentence);
            const sentenceEnd = sentenceStart + sentence.length;

            // Get phrases that fall within this sentence
            phrases.forEach((phrase, idx) => {
              if (phrase.start >= sentenceStart && phrase.end <= sentenceEnd) {
                sentencePhrases.push({ ...phrase, originalIndex: idx });
              }
            });

            return (
              <div key={sentenceIdx} className="sentence-block">
                <div className="sentence-translation">{translation}</div>
                <div className="sentence-chinese">
                  {sentencePhrases.length > 0 ? (
                    sentencePhrases.map((phrase) => (
                      <ChinesePhrase
                        key={phrase.originalIndex}
                        phrase={phrase}
                        index={phrase.originalIndex}
                        showPinyin={false}
                        showPinyinAbove={true}
                        onHighlight={onWordHighlight}
                      />
                    ))
                  ) : (
                    renderTextWithPinyin(sentence)
                  )}
                </div>
              </div>
            );
          } else {
            return (
              <div key={sentenceIdx} className="sentence-block">
                <div className="sentence-translation">{translation}</div>
                <div className="sentence-chinese">
                  {renderTextWithPinyin(sentence)}
                </div>
              </div>
            );
          }
        })}
      </div>
    );
  } else if (displayMode === 'pinyin') {
    return (
      <div className="pinyin-mode">
        {renderTextWithPinyin(text)}
      </div>
    );
  } else if (displayMode === 'tooltips' && phrases && phrases.length > 0) {
    return (
      <div className="tooltip-mode">
        {phrases.map((phrase, idx) => (
          <ChinesePhrase key={idx} phrase={phrase} index={idx} onHighlight={onWordHighlight} />
        ))}
      </div>
    );
  } else if (displayMode === 'tooltips') {
    return (
      <div className="tooltip-mode">
        {text.split('').map((char, idx) => (
          <ChineseChar key={idx} char={char} index={idx} />
        ))}
      </div>
    );
  } else {
    // Plain mode - preserve line breaks
    return (
      <div style={{ whiteSpace: 'pre-wrap' }}>
        {text}
      </div>
    );
  }
}

/**
 * Display mode selector component
 * Four-way segmented control for Plain/Pinyin/Tooltips/Translation
 */
export function DisplayModeSelector({ displayMode, onDisplayModeChange }) {
  return (
    <div className="display-mode-selector">
      <button
        onClick={() => onDisplayModeChange('none')}
        className={`mode-option ${displayMode === 'none' ? 'active' : ''}`}
      >
        Plain
      </button>
      <button
        onClick={() => onDisplayModeChange('pinyin')}
        className={`mode-option ${displayMode === 'pinyin' ? 'active' : ''}`}
      >
        Pinyin
      </button>
      <button
        onClick={() => onDisplayModeChange('tooltips')}
        className={`mode-option ${displayMode === 'tooltips' ? 'active' : ''}`}
      >
        Tooltips
      </button>
      <button
        onClick={() => onDisplayModeChange('translation')}
        className={`mode-option ${displayMode === 'translation' ? 'active' : ''}`}
      >
        Translation
      </button>
    </div>
  );
}

/**
 * Hook for managing phrase segmentation and translation
 */
export function usePhraseSegmentation(apiUrl = '') {
  const [phrases, setPhrases] = useState([]);
  const [phraseTranslations, setPhraseTranslations] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  // Helper function to split text into sentences
  const splitIntoSentences = (text) => {
    const sentenceRegex = /([^。！？.!?\n]+[。！？.!?\n]|[^。！？.!?\n]+$)/g;
    const sentences = text.match(sentenceRegex) || [text];
    return sentences.filter(s => s.trim().length > 0).map(s => s.trim());
  };

  const segmentAndTranslate = async (text, textHash = null, fetchSentences = false) => {
    if (!text) {
      setPhrases([]);
      setPhraseTranslations({});
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const totalStart = performance.now();

    try {
      // Calculate text hash if not provided
      let hash = textHash;
      if (!hash) {
        const hashStart = performance.now();
        const encoder = new TextEncoder();
        const data = encoder.encode(text);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        console.log(`[Frontend] Calculated text_hash in ${(performance.now() - hashStart).toFixed(0)}ms: ${hash.substring(0, 8)}...`);
      }

      console.log(`[Frontend] Analyzing text (include_sentences: ${fetchSentences})...`);

      const analyzeStart = performance.now();
      const analyzeResponse = await fetch(`${apiUrl}/api/analyze-text`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          text_hash: hash,
          include_sentences: fetchSentences
        }),
      });

      if (!analyzeResponse.ok) {
        throw new Error('Failed to analyze text');
      }

      const { phrases: segmentedPhrases, definitions, sentence_translations } = await analyzeResponse.json();
      const analyzeTime = performance.now() - analyzeStart;

      console.log(`[Frontend] Text analyzed in ${analyzeTime.toFixed(0)}ms (${segmentedPhrases.length} phrases, ${Object.keys(definitions).length} definitions)`);

      setPhrases(segmentedPhrases);

      const translations = {};
      for (const [phrase, data] of Object.entries(definitions)) {
        translations[phrase] = data.definitions;
      }

      // Add sentence translations if present
      if (sentence_translations) {
        Object.assign(translations, sentence_translations);
        console.log(`[Frontend] Loaded ${Object.keys(sentence_translations).length} sentence translations`);
      }

      setPhraseTranslations(translations);

      const totalTime = performance.now() - totalStart;
      console.log(`[Frontend] Total process: ${totalTime.toFixed(0)}ms`);
    } catch (err) {
      console.error('[Frontend] Error analyzing text:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSentenceTranslations = async (text, textHash = null) => {
    if (!text) return;

    // Just re-call segmentAndTranslate with include_sentences = true
    await segmentAndTranslate(text, textHash, true);
  };

  const reset = () => {
    setPhrases([]);
    setPhraseTranslations({});
    setIsLoading(false);
  };

  return { phrases, phraseTranslations, isLoading, segmentAndTranslate, fetchSentenceTranslations, reset };
}
