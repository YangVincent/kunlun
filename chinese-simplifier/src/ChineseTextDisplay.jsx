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
  uniqueId = 'default'
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

  // Helper function to render text with pinyin above characters
  const renderTextWithPinyin = (text) => {
    return text.split('').map((char, idx) => {
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
  const ChinesePhrase = ({ phrase, index }) => {
    const [hoverActive, setHoverActive] = useState(false);
    const [tooltipStyle, setTooltipStyle] = useState({ opacity: 0 });
    const spanRef = useRef(null);
    const tooltipRef = useRef(null);

    if (!/[\u4e00-\u9fa5]/.test(phrase.text)) {
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
        {phrase.text}
        {isActive && displayMode === 'tooltips' && (
          <span ref={tooltipRef} className="char-tooltip" style={tooltipStyle}>
            <div className="tooltip-pinyin">{phrasePinyin}</div>
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
  if (displayMode === 'pinyin') {
    return (
      <div className="pinyin-mode">
        {renderTextWithPinyin(text)}
      </div>
    );
  } else if (displayMode === 'tooltips' && phrases && phrases.length > 0) {
    return (
      <div className="tooltip-mode">
        {phrases.map((phrase, idx) => (
          <ChinesePhrase key={idx} phrase={phrase} index={idx} />
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
    return <span>{text}</span>;
  }
}

/**
 * Display mode selector component
 * Three-way segmented control for Plain/Pinyin/Tooltips
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
    </div>
  );
}

/**
 * Hook for managing phrase segmentation and translation
 */
export function usePhraseSegmentation(apiUrl = '') {
  const [phrases, setPhrases] = useState([]);
  const [phraseTranslations, setPhraseTranslations] = useState({});

  const segmentAndTranslate = async (text) => {
    if (!text) {
      setPhrases([]);
      setPhraseTranslations({});
      return;
    }

    try {
      const segmentResponse = await fetch(`${apiUrl}/api/segment-text`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      });

      if (!segmentResponse.ok) {
        throw new Error('Failed to segment text');
      }

      const { phrases: segmentedPhrases } = await segmentResponse.json();
      setPhrases(segmentedPhrases);

      const chinesePhrases = segmentedPhrases
        .filter(p => /[\u4e00-\u9fa5]/.test(p.text))
        .map(p => p.text);

      if (chinesePhrases.length > 0) {
        const definitionResponse = await fetch(`${apiUrl}/api/lookup-definitions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ phrases: chinesePhrases }),
        });

        const { definitions } = await definitionResponse.json();

        const translations = {};
        for (const [phrase, data] of Object.entries(definitions)) {
          translations[phrase] = data.definitions;
        }

        setPhraseTranslations(translations);
      }
    } catch (err) {
      console.error('Error segmenting/translating text:', err);
    }
  };

  const reset = () => {
    setPhrases([]);
    setPhraseTranslations({});
  };

  return { phrases, phraseTranslations, segmentAndTranslate, reset };
}
