import React from 'react';
import { Link } from 'react-router-dom';
import { AuthButton } from './AuthButton';
import './Home.css';

export default function Home() {
  return (
    <div className="home-container">
      <div className="bg-decoration"></div>

      <div className="auth-header">
        <AuthButton />
      </div>

      <header className="home-header">
        <h1 className="home-title">
          <span className="title-en">Comprehensible Mandarin</span>
          <span className="title-zh">可理解中文</span>
        </h1>
        <p className="home-tagline">Making Chinese accessible through comprehensible input</p>
      </header>

      <main className="home-content">
        <div className="features-grid">

          {/* Text Simplifier */}
          <Link to="/simplifier" className="feature-card">
            <div className="feature-icon">简</div>
            <h2 className="feature-title">Text Simplifier</h2>
            <p className="feature-description">
              Simplify complex Chinese text to match your HSK level. Perfect for making news articles and authentic content more accessible.
            </p>
            <div className="feature-tags">
              <span className="tag">HSK Levels</span>
              <span className="tag">URL Import</span>
              <span className="tag">Annotations</span>
            </div>
          </Link>

          {/* Reader */}
          <Link to="/reader" className="feature-card">
            <div className="feature-icon">读</div>
            <h2 className="feature-title">Interactive Reader</h2>
            <p className="feature-description">
              Paste any Chinese text and get instant pinyin, tooltips, and translations. Supports line breaks and natural text formatting.
            </p>
            <div className="feature-tags">
              <span className="tag">Pinyin</span>
              <span className="tag">Tooltips</span>
              <span className="tag">Definitions</span>
            </div>
          </Link>

          {/* News Search */}
          <Link to="/news" className="feature-card">
            <div className="feature-icon">新</div>
            <h2 className="feature-title">News Search</h2>
            <p className="feature-description">
              Search for Chinese news articles and export them directly to the simplifier. Stay current with authentic content.
            </p>
            <div className="feature-tags">
              <span className="tag">Real News</span>
              <span className="tag">Search</span>
              <span className="tag">Export</span>
            </div>
          </Link>

          {/* Chat Interface */}
          <Link to="/chat" className="feature-card">
            <div className="feature-icon">聊</div>
            <h2 className="feature-title">AI Chat</h2>
            <p className="feature-description">
              Practice Chinese with an AI conversation partner. Get responses with pinyin and translations for better understanding.
            </p>
            <div className="feature-tags">
              <span className="tag">AI Powered</span>
              <span className="tag">Interactive</span>
              <span className="tag">Practice</span>
            </div>
          </Link>

          {/* Audio Player */}
          <Link to="/listen" className="feature-card">
            <div className="feature-icon">听</div>
            <h2 className="feature-title">Audio Player</h2>
            <p className="feature-description">
              Upload and play Chinese audio files. Perfect for listening practice with podcasts, audiobooks, and language lessons.
            </p>
            <div className="feature-tags">
              <span className="tag">Audio Upload</span>
              <span className="tag">Playback</span>
              <span className="tag">Listening Practice</span>
            </div>
          </Link>

          {/* Vocabulary */}
          <Link to="/vocabulary" className="feature-card">
            <div className="feature-icon">词</div>
            <h2 className="feature-title">My Vocabulary</h2>
            <p className="feature-description">
              Track words you've looked up while reading. Review your personalized vocabulary list and see which words you encounter most.
            </p>
            <div className="feature-tags">
              <span className="tag">Word Tracking</span>
              <span className="tag">Review</span>
              <span className="tag">Sign In Required</span>
            </div>
          </Link>

        </div>

        <section className="about-section">
          <h2>About Comprehensible Input</h2>
          <p>
            Language learning is most effective when you engage with content that is just slightly above your current level—comprehensible input.
            Our tools help you access authentic Chinese content at the right level for you, making language acquisition natural and enjoyable.
          </p>
        </section>
      </main>

      <footer className="home-footer">
        <p>Built for learners, by learners</p>
      </footer>
    </div>
  );
}
