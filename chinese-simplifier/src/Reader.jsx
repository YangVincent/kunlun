import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './Reader.css';
import { ChineseTextDisplay, DisplayModeSelector, usePhraseSegmentation } from './ChineseTextDisplay';

export default function Reader() {
  const [inputText, setInputText] = useState('');
  const [processedText, setProcessedText] = useState('');
  const [displayMode, setDisplayMode] = useState('tooltips');
  const { phrases, phraseTranslations, segmentAndTranslate, reset } = usePhraseSegmentation();

  // Debounced processing: trigger 3 seconds after user stops typing
  useEffect(() => {
    if (!inputText.trim()) {
      setProcessedText('');
      reset();
      return;
    }

    const timeoutId = setTimeout(() => {
      processText(inputText);
    }, 3000);

    return () => clearTimeout(timeoutId);
  }, [inputText]);

  // Process text: segment and translate
  const processText = async (text) => {
    if (!text.trim()) {
      setProcessedText('');
      reset();
      return;
    }

    setProcessedText(text);
    await segmentAndTranslate(text);
  };

  // Handle paste event: process immediately
  const handlePaste = (e) => {
    const pastedText = e.clipboardData.getData('text');
    if (pastedText) {
      setInputText(pastedText);
      // Process immediately on paste
      setTimeout(() => {
        processText(pastedText);
      }, 0);
    }
  };

  // Clear all input and processed text
  const handleClear = () => {
    setInputText('');
    setProcessedText('');
    reset();
  };

  return (
    <div className="reader-container">
      <header className="reader-header">
        <Link to="/" className="back-link">← Home</Link>
        <h1>Chinese Reader</h1>
        <div className="header-spacer"></div>
      </header>

      <div className="reader-content">
        {/* Input Section */}
        <section className="input-section">
          <div className="section-header">
            <h2>Input Chinese Text</h2>
            {inputText && (
              <button onClick={handleClear} className="clear-button">
                Clear
              </button>
            )}
          </div>
          <textarea
            className="text-input"
            placeholder="Type or paste Chinese text here..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onPaste={handlePaste}
            rows={8}
          />
          <div className="input-hint">
            Text will be processed automatically: immediately on paste, or 3 seconds after you stop typing
          </div>
        </section>

        {/* Display Section */}
        {processedText && (
          <section className="display-section">
            <div className="section-header">
              <h2>Display</h2>
              <DisplayModeSelector
                displayMode={displayMode}
                onDisplayModeChange={setDisplayMode}
              />
            </div>
            <div className="text-display">
              <ChineseTextDisplay
                text={processedText}
                phrases={phrases}
                phraseTranslations={phraseTranslations}
                displayMode={displayMode}
                uniqueId="reader"
              />
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
