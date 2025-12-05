import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import './Listen.css';

export default function Listen() {
  const [audioFile, setAudioFile] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const audioRef = useRef(null);
  const fileInputRef = useRef(null);

  const handleFileSelect = (event) => {
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

  const handleClear = () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioFile(null);
    setAudioUrl(null);
    setIsPlaying(false);
    setPlaybackSpeed(1.0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSpeedChange = (speed) => {
    setPlaybackSpeed(speed);
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
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

          {!audioFile ? (
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
              <audio
                ref={audioRef}
                src={audioUrl}
                onEnded={handleAudioEnded}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
              />

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
                <button
                  className="play-button"
                  onClick={handlePlayPause}
                >
                  {isPlaying ? (
                    <span className="control-icon">⏸</span>
                  ) : (
                    <span className="control-icon">▶</span>
                  )}
                </button>

                <div className="audio-element">
                  <audio
                    controls
                    src={audioUrl}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>
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
