import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { AuthButton } from './AuthButton';
import './Vocabulary.css';

export default function Vocabulary() {
  const { user, loading: authLoading } = useAuth();
  const [words, setWords] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [sortBy, setSortBy] = useState('count'); // 'count', 'recent', 'alphabetical'

  useEffect(() => {
    if (!authLoading && user) {
      fetchWords();
    } else if (!authLoading && !user) {
      setIsLoading(false);
    }
  }, [authLoading, user]);

  const fetchWords = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/highlighted-words?user_id=${user.id}`);

      if (!response.ok) {
        throw new Error('Failed to fetch vocabulary');
      }

      const data = await response.json();
      setWords(data.words || []);
    } catch (err) {
      console.error('Error fetching vocabulary:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteWord = async (wordId) => {
    try {
      const response = await fetch(`/api/highlighted-words/${wordId}?user_id=${user.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete word');
      }

      setWords(words.filter(w => w.id !== wordId));
    } catch (err) {
      console.error('Error deleting word:', err);
      setError(err.message);
    }
  };

  const togglePin = async (wordId, currentPinned) => {
    try {
      const response = await fetch(`/api/highlighted-words/${wordId}/pin`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          pinned: !currentPinned
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update pin status');
      }

      setWords(words.map(w =>
        w.id === wordId ? { ...w, pinned: !currentPinned } : w
      ));
    } catch (err) {
      console.error('Error toggling pin:', err);
      setError(err.message);
    }
  };

  const sortedWords = [...words].sort((a, b) => {
    // Pinned words always come first
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;

    // Then sort by selected criteria
    switch (sortBy) {
      case 'count':
        return b.highlight_count - a.highlight_count;
      case 'recent':
        const aLatest = a.timestamps[a.timestamps.length - 1];
        const bLatest = b.timestamps[b.timestamps.length - 1];
        return new Date(bLatest) - new Date(aLatest);
      case 'alphabetical':
        return a.word.localeCompare(b.word, 'zh');
      default:
        return 0;
    }
  });

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Not logged in state
  if (!authLoading && !user) {
    return (
      <div className="vocabulary-container">
        <div className="bg-decoration"></div>

        <div className="content-wrapper">
          <header className="vocabulary-header">
            <div className="header-left">
              <Link to="/" className="back-link">← Home</Link>
              <h1>My Vocabulary</h1>
            </div>
            <AuthButton />
          </header>

          <div className="login-prompt">
            <div className="login-icon">词</div>
            <h2>Sign in to track your vocabulary</h2>
            <p>
              When you click on words while reading, they'll be saved here for review.
              Sign in with Google to start building your personal vocabulary list.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="vocabulary-container">
      <div className="bg-decoration"></div>

      <div className="content-wrapper">
        <header className="vocabulary-header">
          <div className="header-left">
            <Link to="/" className="back-link">← Home</Link>
            <h1>My Vocabulary</h1>
          </div>
          <AuthButton />
        </header>

        {error && (
          <div className="error-banner">
            <span>{error}</span>
            <button onClick={() => setError('')}>×</button>
          </div>
        )}

        <div className="vocabulary-controls">
          <div className="word-count">
            {words.length} {words.length === 1 ? 'word' : 'words'} saved
          </div>
          <div className="sort-controls">
            <label>Sort by:</label>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="count">Most highlighted</option>
              <option value="recent">Most recent</option>
              <option value="alphabetical">Alphabetical</option>
            </select>
          </div>
        </div>

        {isLoading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading vocabulary...</p>
          </div>
        ) : words.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">词</div>
            <h2>No words yet</h2>
            <p>
              Start reading Chinese content and click on words to look them up.
              They'll automatically be saved here for review.
            </p>
            <div className="empty-actions">
              <Link to="/reader" className="action-link">Go to Reader →</Link>
              <Link to="/listen" className="action-link">Go to Listen →</Link>
            </div>
          </div>
        ) : (
          <div className="words-grid">
            {sortedWords.map((word) => (
              <div key={word.id} className={`word-card ${word.pinned ? 'pinned' : ''}`}>
                <div className="word-header">
                  <span className="word-chinese">{word.word}</span>
                  <div className="word-header-actions">
                    <button
                      className={`pin-btn ${word.pinned ? 'active' : ''}`}
                      onClick={() => togglePin(word.id, word.pinned)}
                      title={word.pinned ? 'Unpin word' : 'Pin to top'}
                    >
                      {word.pinned ? '📌' : '📍'}
                    </button>
                    <span className="word-count-badge">{word.highlight_count}×</span>
                  </div>
                </div>
                {word.pinyin && (
                  <div className="word-pinyin">{word.pinyin}</div>
                )}
                {word.definition && (
                  <div className="word-definition">{word.definition}</div>
                )}
                <div className="word-footer">
                  <span className="word-last-seen">
                    Last: {formatDate(word.timestamps[word.timestamps.length - 1])}
                  </span>
                  <button
                    className="delete-btn"
                    onClick={() => deleteWord(word.id)}
                    title="Remove from vocabulary"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
