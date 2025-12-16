import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import './Reader.css';
import { ChineseTextDisplay, DisplayModeSelector, usePhraseSegmentation } from './ChineseTextDisplay';
import { saveReaderState, loadReaderState, clearReaderState } from './textStorage';

export default function Reader() {
  const [inputText, setInputText] = useState('');
  const [processedText, setProcessedText] = useState('');
  const [displayMode, setDisplayMode] = useState('tooltips');
  const { phrases, phraseTranslations, segmentAndTranslate, reset } = usePhraseSegmentation();

  // Track if state has been restored from IndexedDB
  const stateRestored = useRef(false);

  // Restore state from IndexedDB on mount
  useEffect(() => {
    const restoreState = async () => {
      const saved = await loadReaderState();
      if (saved) {
        console.log('[Reader] Restoring state from IndexedDB');
        if (saved.inputText) setInputText(saved.inputText);
        if (saved.processedText) setProcessedText(saved.processedText);
        if (saved.displayMode) setDisplayMode(saved.displayMode);

        // Re-segment the text if we have processed text
        if (saved.processedText) {
          segmentAndTranslate(saved.processedText);
        }
      }
      stateRestored.current = true;
    };

    restoreState();
  }, []);

  // Save state to IndexedDB when key values change
  useEffect(() => {
    if (!stateRestored.current) return;

    const state = {
      inputText,
      processedText,
      displayMode
    };

    saveReaderState(state);
  }, [inputText, processedText, displayMode]);

  // Debounced processing: trigger 3 seconds after user stops typing
  useEffect(() => {
    // Skip debounced processing if state was just restored
    if (!stateRestored.current) return;

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
    clearReaderState();
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
