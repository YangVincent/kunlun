import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import './Listen.css';
import { ChineseTextDisplay, DisplayModeSelector, usePhraseSegmentation } from './ChineseTextDisplay';
import { saveAudioFile, loadAudioFile, clearAudioFile, updateAudioMetadata } from './audioStorage';
import { useAuth } from './AuthContext';

export default function Listen() {
  const { user } = useAuth();

  // Handler for saving highlighted words
  const handleWordHighlight = useCallback(async (word, pinyin, definition) => {
    if (!user) return; // Only save for logged-in users

    try {
      await fetch('/api/highlighted-words', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          word,
          pinyin,
          definition
        })
      });
    } catch (err) {
      console.error('[Listen] Error saving highlighted word:', err);
    }
  }, [user]);

  const [audioFile, setAudioFile] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [transcript, setTranscript] = useState(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcriptError, setTranscriptError] = useState(null);
  const [isCached, setIsCached] = useState(false);
  const [displayMode, setDisplayMode] = useState('translation');
  const [isRestoring, setIsRestoring] = useState(true);
  const audioRef = useRef(null);
  const fileInputRef = useRef(null);

  // Phrase segmentation for transcript display
  const { phrases, phraseTranslations, isLoading: isLoadingTranslations, segmentAndTranslate, fetchSentenceTranslations, reset } = usePhraseSegmentation();

  // Helper to create blob URL from file
  const createBlobUrl = useCallback((file) => {
    return URL.createObjectURL(file);
  }, []);

  // Restore audio file from IndexedDB on mount
  useEffect(() => {
    const restoreAudio = async () => {
      try {
        const saved = await loadAudioFile();
        if (saved) {
          console.log('[Listen] Restoring audio from IndexedDB:', saved.file.name);
          const url = createBlobUrl(saved.file);
          setAudioFile(saved.file);
          setAudioUrl(url);

          // Restore metadata
          if (saved.metadata.transcript) {
            setTranscript(saved.metadata.transcript);
            setIsCached(saved.metadata.isCached || false);
          }
          if (saved.metadata.displayMode) {
            setDisplayMode(saved.metadata.displayMode);
          }
          if (saved.metadata.playbackSpeed) {
            setPlaybackSpeed(saved.metadata.playbackSpeed);
          }
        }
      } catch (error) {
        console.error('[Listen] Error restoring audio:', error);
      } finally {
        setIsRestoring(false);
      }
    };

    restoreAudio();
  }, [createBlobUrl]);

  // Handle visibility change - recreate blob URL when tab becomes visible
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && audioFile) {
        // Check if the current blob URL is still valid by trying to fetch it
        try {
          const response = await fetch(audioUrl, { method: 'HEAD' });
          if (!response.ok) throw new Error('Blob URL invalid');
        } catch {
          // Blob URL is invalid, recreate it from the file
          console.log('[Listen] Recreating blob URL after tab switch');
          if (audioUrl) {
            URL.revokeObjectURL(audioUrl);
          }
          const newUrl = createBlobUrl(audioFile);
          setAudioUrl(newUrl);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [audioFile, audioUrl, createBlobUrl]);

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, []);

  const handleFileSelect = async (event) => {
    const file = event.target.files[0];
    if (file) {
      // Check if it's an audio file
      if (!file.type.startsWith('audio/')) {
        alert('Please select an audio file');
        return;
      }

      // Clean up previous URL if exists
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }

      // Create object URL for the file
      const url = URL.createObjectURL(file);
      setAudioFile(file);
      setAudioUrl(url);
      setIsPlaying(false);

      // Reset transcript state for new file
      setTranscript(null);
      setTranscriptError(null);
      setIsCached(false);

      // Save to IndexedDB for persistence
      await saveAudioFile(file, { displayMode, playbackSpeed });
      console.log('[Listen] Audio file saved to IndexedDB');
    }
  };

  const handlePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
  };

  const handleClear = async () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioFile(null);
    setAudioUrl(null);
    setIsPlaying(false);
    setPlaybackSpeed(1.0);
    setTranscript(null);
    setTranscriptError(null);
    setIsCached(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    // Clear from IndexedDB
    await clearAudioFile();
    console.log('[Listen] Audio file cleared from IndexedDB');
  };

  const handleSpeedChange = (speed) => {
    setPlaybackSpeed(speed);
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
    }
  };

  // Apply playback speed when audio element is ready
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackSpeed;
    }
  }, [audioUrl, playbackSpeed]);

  const handleGenerateTranscript = async () => {
    if (!audioFile) return;

    setIsTranscribing(true);
    setTranscriptError(null);

    try {
      const totalStart = performance.now();

      // Step 1: Calculate hash on client side
      const hashStart = performance.now();
      console.log('[Frontend] Calculating file hash...');

      const arrayBuffer = await audioFile.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const fileHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      const hashTime = performance.now() - hashStart;
      console.log(`[Frontend] Hash calculated in ${hashTime.toFixed(0)}ms: ${fileHash.substring(0, 8)}...`);

      // Step 2: Check if cached
      const cacheCheckStart = performance.now();
      console.log('[Frontend] Checking cache...');

      const cacheResponse = await fetch('/api/check-transcript-cache', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ file_hash: fileHash })
      });

      const cacheCheckTime = performance.now() - cacheCheckStart;

      if (cacheResponse.ok) {
        const cacheData = await cacheResponse.json();

        if (cacheData.cached) {
          // Cache hit - no need to upload file!
          const totalTime = performance.now() - totalStart;
          console.log(`[Frontend] Cache HIT! Transcript loaded in ${totalTime.toFixed(0)}ms (hash: ${hashTime.toFixed(0)}ms, cache check: ${cacheCheckTime.toFixed(0)}ms)`);

          setTranscript({
            ...cacheData.transcript,
            audio_hash: fileHash,
            language_code: cacheData.language_code,
            language_probability: cacheData.language_probability
          });
          setIsCached(true);
          return;
        }
      }

      console.log(`[Frontend] Cache MISS. Uploading file for transcription... (cache check: ${cacheCheckTime.toFixed(0)}ms)`);

      // Step 3: Cache miss - upload file for transcription
      const formData = new FormData();
      formData.append('audio', audioFile);
      formData.append('file_hash', fileHash);

      const uploadStart = performance.now();

      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Transcription failed');
      }

      const data = await response.json();
      const uploadTime = performance.now() - uploadStart;
      const totalTime = performance.now() - totalStart;

      console.log(`[Frontend] Transcription completed in ${totalTime.toFixed(0)}ms (hash: ${hashTime.toFixed(0)}ms, upload+transcribe: ${uploadTime.toFixed(0)}ms)`);

      // Store the full response data which includes audio_hash, language_code, etc.
      setTranscript({
        ...data.transcript,
        audio_hash: fileHash,
        language_code: data.language_code,
        language_probability: data.language_probability
      });
      setIsCached(false);
    } catch (error) {
      console.error('[Frontend] Transcription error:', error);
      setTranscriptError(error.message);
    } finally {
      setIsTranscribing(false);
    }
  };

  // Process transcript text when available
  useEffect(() => {
    if (transcript?.text) {
      console.log('[Listen] Transcript text available');
      // Note: segmentAndTranslate will calculate text_hash from the text
      segmentAndTranslate(transcript.text);
    } else {
      reset();
    }
  }, [transcript]);

  // Fetch sentence translations when in translation mode and transcript is available
  useEffect(() => {
    if (displayMode === 'translation' && transcript?.text) {
      // Check if we already have sentence translations
      const hasSentenceTranslations = Object.keys(phraseTranslations).some(key =>
        key.length > 10 && (key.includes('。') || key.includes('！') || key.includes('？'))
      );

      if (!hasSentenceTranslations) {
        console.log('[Listen] Fetching sentence translations');
        fetchSentenceTranslations(transcript.text);
      }
    }
  }, [displayMode, transcript?.text, phraseTranslations]);

  // Persist metadata changes to IndexedDB (transcript, displayMode, playbackSpeed)
  useEffect(() => {
    // Don't save during initial restore
    if (isRestoring || !audioFile) return;

    const saveMetadata = async () => {
      await updateAudioMetadata({
        transcript,
        isCached,
        displayMode,
        playbackSpeed
      });
    };

    saveMetadata();
  }, [transcript, isCached, displayMode, playbackSpeed, isRestoring, audioFile]);

  const handleWordClick = (startTime) => {
    if (audioRef.current) {
      audioRef.current.currentTime = startTime;
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleDrop = (event) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file && file.type.startsWith('audio/')) {
      const fakeEvent = {
        target: {
          files: [file]
        }
      };
      handleFileSelect(fakeEvent);
    }
  };

  const handleDragOver = (event) => {
    event.preventDefault();
  };

  return (
    <div className="listen-container">
      <header className="listen-header">
        <Link to="/" className="back-link">← Home</Link>
        <h1>Audio Player</h1>
        <div className="header-spacer"></div>
      </header>

      <div className="listen-content">
        {/* Upload Section */}
        <section className="upload-section">
          <h2>Upload Audio File</h2>

          {isRestoring ? (
            <div className="drop-zone" style={{ cursor: 'default' }}>
              <div className="drop-zone-icon">Loading...</div>
              <p className="drop-zone-text">Restoring previous session...</p>
            </div>
          ) : !audioFile ? (
            <div
              className="drop-zone"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="drop-zone-icon">🎵</div>
              <p className="drop-zone-text">
                Drag and drop an audio file here, or click to select
              </p>
              <p className="drop-zone-hint">
                Supports MP3, WAV, OGG, M4A, and other audio formats
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
            </div>
          ) : (
            <div className="file-info">
              <div className="file-details">
                <div className="file-icon">🎵</div>
                <div className="file-text">
                  <div className="file-name">{audioFile.name}</div>
                  <div className="file-size">
                    {(audioFile.size / 1024 / 1024).toFixed(2)} MB
                  </div>
                </div>
              </div>
              <button onClick={handleClear} className="clear-button">
                Remove
              </button>
            </div>
          )}
        </section>

        {/* Player Section */}
        {audioUrl && (
          <section className="player-section">
            <h2>Audio Player</h2>

            <div className="audio-player">
              {/* Speed Controls */}
              <div className="speed-controls">
                <label className="speed-label">Playback Speed:</label>
                <div className="speed-buttons">
                  {[0.5, 0.75, 1.0, 1.25, 1.5, 2.0].map((speed) => (
                    <button
                      key={speed}
                      className={`speed-button ${playbackSpeed === speed ? 'active' : ''}`}
                      onClick={() => handleSpeedChange(speed)}
                    >
                      {speed}x
                    </button>
                  ))}
                </div>
              </div>

              <div className="player-controls">
                <div className="audio-element">
                  <audio
                    ref={audioRef}
                    controls
                    src={audioUrl}
                    onEnded={handleAudioEnded}
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>
            </div>

            {/* Transcript Button */}
            <div className="transcript-actions">
              <button
                onClick={handleGenerateTranscript}
                disabled={isTranscribing}
                className="transcript-button"
              >
                {isTranscribing ? 'Transcribing...' : 'Generate Chinese Transcript'}
              </button>
            </div>
          </section>
        )}

        {/* Transcript Section */}
        {transcript && (
          <section className="transcript-section">
            <h2>Transcript</h2>
            {transcriptError ? (
              <div className="transcript-error">
                <p>Error: {transcriptError}</p>
              </div>
            ) : (
              <div className="transcript-content">
                <div className="transcript-meta">
                  <span>Language: Chinese ({transcript.language_code})</span>
                  {transcript.language_probability && (
                    <span>Confidence: {(transcript.language_probability * 100).toFixed(1)}%</span>
                  )}
                </div>

                {/* Display Mode Selector */}
                <DisplayModeSelector
                  displayMode={displayMode}
                  onDisplayModeChange={setDisplayMode}
                />

                {/* Loading indicator for translations */}
                {isLoadingTranslations && (
                  <div className="translation-loading">
                    Loading translations...
                  </div>
                )}

                {/* Chinese Text Display */}
                <ChineseTextDisplay
                  text={transcript.text}
                  displayMode={displayMode}
                  phrases={phrases}
                  phraseTranslations={phraseTranslations}
                  onWordHighlight={handleWordHighlight}
                />
              </div>
            )}
          </section>
        )}

        {transcriptError && !transcript && (
          <section className="transcript-section">
            <h2>Transcript Error</h2>
            <div className="transcript-error">
              <p>{transcriptError}</p>
              <button onClick={handleGenerateTranscript} className="retry-button">
                Try Again
              </button>
            </div>
          </section>
        )}

        {/* Instructions */}
        <section className="instructions-section">
          <h2>How to Use</h2>
          <ol className="instructions-list">
            <li>Upload an audio file by dragging and dropping or clicking to select</li>
            <li>Use the audio player controls to play, pause, and seek through the audio</li>
            <li>Adjust volume using the player controls</li>
            <li>Remove the file to upload a different one</li>
          </ol>
        </section>
      </div>
    </div>
  );
}
