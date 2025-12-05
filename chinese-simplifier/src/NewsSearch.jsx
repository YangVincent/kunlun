import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { pinyin } from 'pinyin-pro';
import './NewsSearch.css';

const DEFAULT_SOURCES = [
  { name: 'Caixin', url: 'https://www.caixin.com/?HOLDZH' },
  { name: 'BBC Chinese', url: 'https://www.bbc.com/zhongwen/simp' }
];

export default function NewsSearch() {
  const [articles, setArticles] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchArticles();
  }, []);

  const fetchArticles = async () => {
    setIsLoading(true);
    setError('');
    setArticles([]);

    try {
      const response = await fetch('/api/fetch-news', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sources: DEFAULT_SOURCES }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch news articles');
      }

      const data = await response.json();
      setArticles(data.articles || []);
    } catch (err) {
      setError(`Error fetching articles: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleArticleClick = (articleUrl) => {
    // Navigate to the main simplifier with the URL pre-filled
    navigate('/simplifier', { state: { url: articleUrl } });
  };

  return (
    <div className="news-search-container">
      <div className="bg-decoration"></div>
      <div className="vertical-text-decoration">新闻</div>

      <div className="content-wrapper">
        {/* Header */}
        <header className="header-section">
          <div className="title-block">
            <h1 className="main-title">
              <span className="title-chinese">新闻搜索</span>
              <span className="title-separator"></span>
              <span className="title-english">News Search</span>
            </h1>
            <p className="subtitle">Discover Chinese news articles from trusted sources</p>
          </div>

          <button onClick={() => navigate('/')} className="back-btn">
            ← Back to Home
          </button>
        </header>

        {/* Sources Display */}
        <div className="sources-section">
          <h3>News Sources</h3>
          <div className="sources-list">
            {DEFAULT_SOURCES.map((source, idx) => (
              <span key={idx} className="source-badge">{source.name}</span>
            ))}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="error-banner">
            <span className="error-icon">⚠</span>
            <span>{error}</span>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="loading-section">
            <div className="spinner"></div>
            <p>Fetching latest articles...</p>
          </div>
        )}

        {/* Articles Grid */}
        {!isLoading && articles.length > 0 && (
          <div className="articles-grid">
            {articles.map((article, idx) => {
              const titlePinyin = pinyin(article.title, { toneType: 'symbol' });

              return (
                <div
                  key={idx}
                  className="article-card"
                  onClick={() => handleArticleClick(article.url)}
                >
                  <div className="article-header">
                    <span className="article-source">{article.source}</span>
                    {article.date && <span className="article-date">{article.date}</span>}
                  </div>
                  <div className="article-title-section">
                    <div className="article-pinyin">{titlePinyin}</div>
                    <h3 className="article-title">{article.title}</h3>
                    {article.translation && (
                      <div className="article-translation">{article.translation}</div>
                    )}
                  </div>
                  {article.description && (
                    <p className="article-description">{article.description}</p>
                  )}
                  <div className="article-footer">
                    <span className="read-more">Read & Simplify →</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && articles.length === 0 && !error && (
          <div className="empty-state">
            <p>No articles found. Try refreshing the page.</p>
            <button onClick={fetchArticles} className="primary-btn">
              Refresh
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
