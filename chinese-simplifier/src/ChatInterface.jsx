import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import './ChatInterface.css';
import { ChineseTextDisplay, DisplayModeSelector } from './ChineseTextDisplay';
import { supabase, getSessionId } from './supabaseClient';

export default function ChatInterface() {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [displayMode, setDisplayMode] = useState('tooltips'); // 'none', 'pinyin', 'tooltips'
  const [phrases, setPhrases] = useState({});
  const [phraseTranslations, setPhraseTranslations] = useState({});
  const [sessionId] = useState(getSessionId());
  const messagesEndRef = useRef(null);

  // Load chat history on mount
  useEffect(() => {
    loadChatHistory();
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadChatHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        const loadedMessages = data.map(msg => ({
          id: msg.id,
          role: msg.role,
          content: msg.content
        }));
        setMessages(loadedMessages);

        // Segment and translate any Chinese messages
        for (const msg of loadedMessages) {
          if (msg.role === 'assistant' && /[\u4e00-\u9fa5]/.test(msg.content)) {
            segmentAndTranslate(msg.content, msg.id);
          }
        }
      }
    } catch (err) {
      console.error('Error loading chat history:', err);
    }
  };

  const saveMessage = async (message) => {
    try {
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          session_id: sessionId,
          role: message.role,
          content: message.content
        });

      if (error) throw error;
    } catch (err) {
      console.error('Error saving message:', err);
    }
  };

  const clearHistory = async () => {
    if (!confirm('Are you sure you want to clear all chat history? This cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('chat_messages')
        .delete()
        .eq('session_id', sessionId);

      if (error) throw error;

      // Clear local state
      setMessages([]);
      setPhrases({});
      setPhraseTranslations({});
    } catch (err) {
      console.error('Error clearing history:', err);
      alert('Failed to clear history. Please try again.');
    }
  };

  // Segment and translate Chinese text
  const segmentAndTranslate = async (text, messageId) => {
    if (!text) return;

    try {
      const segmentResponse = await fetch('http://137.184.55.135:3001/api/segment-text', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      });

      if (!segmentResponse.ok) return;

      const { phrases: segmentedPhrases } = await segmentResponse.json();

      setPhrases(prev => ({
        ...prev,
        [messageId]: segmentedPhrases
      }));

      const chinesePhrases = segmentedPhrases
        .filter(p => /[\u4e00-\u9fa5]/.test(p.text))
        .map(p => p.text);

      if (chinesePhrases.length > 0) {
        const definitionResponse = await fetch('http://137.184.55.135:3001/api/lookup-definitions', {
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

        setPhraseTranslations(prev => ({
          ...prev,
          [messageId]: translations
        }));
      }
    } catch (err) {
      console.error('Error segmenting/translating text:', err);
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    // Check if user is asking to clear history
    const clearPatterns = [
      /clear.*history/i,
      /delete.*history/i,
      /clear.*chat/i,
      /delete.*chat/i,
      /clear.*conversation/i,
      /reset.*chat/i,
      /start.*over/i,
      /new.*conversation/i
    ];

    if (clearPatterns.some(pattern => pattern.test(inputMessage))) {
      await clearHistory();
      setInputMessage('');
      return;
    }

    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: inputMessage
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    // Save user message to Supabase
    await saveMessage(userMessage);

    try {
      const response = await fetch('http://137.184.55.135:3001/api/claude', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 4000,
          messages: [
            ...messages.map(m => ({ role: m.role, content: m.content })),
            { role: 'user', content: inputMessage }
          ],
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response from Claude');
      }

      const data = await response.json();
      const assistantMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: data.content[0].text
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Save assistant message to Supabase
      await saveMessage(assistantMessage);

      // Segment and translate if there's Chinese content
      if (/[\u4e00-\u9fa5]/.test(assistantMessage.content)) {
        segmentAndTranslate(assistantMessage.content, assistantMessage.id);
      }
    } catch (err) {
      console.error('Error sending message:', err);
      const errorMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: `Error: ${err.message}`
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };


  const renderMessageContent = (message) => {
    const hasChinese = /[\u4e00-\u9fa5]/.test(message.content);

    if (!hasChinese) {
      return <div className="message-text">{message.content}</div>;
    }

    const modeClass = displayMode === 'pinyin' ? 'pinyin-mode' : displayMode === 'tooltips' ? 'tooltip-mode' : '';

    return (
      <div className={`message-text ${modeClass}`}>
        <ChineseTextDisplay
          text={message.content}
          phrases={phrases[message.id] || []}
          phraseTranslations={phraseTranslations[message.id] || {}}
          displayMode={displayMode}
          uniqueId={`msg-${message.id}`}
        />
      </div>
    );
  };

  return (
    <div className="chat-container">
      <div className="bg-decoration"></div>
      <div className="vertical-text-decoration">对话</div>

      <div className="content-wrapper" style={{ padding: '0.5rem var(--space-md)' }}>
        {/* Compact Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0' }}>
          <h1 style={{ margin: 0, fontSize: '1.3rem', fontFamily: 'var(--font-display)', color: 'var(--color-ink)' }}>
            聊天 · Chat
          </h1>
          <Link to="/" className="back-btn" style={{ padding: '0.5rem 1rem', marginTop: 0 }}>
            ← Back
          </Link>
        </div>

        {/* Chat Messages */}
        <div className="chat-card">
          <div className="chat-header">
            <h2>Conversation</h2>
            <DisplayModeSelector
              displayMode={displayMode}
              onDisplayModeChange={setDisplayMode}
            />
          </div>

          <div className="messages-container">
            {messages.length === 0 && (
              <div className="empty-chat">
                <p>Start a conversation in English or Chinese!</p>
              </div>
            )}

            {messages.map((message) => (
              <div key={message.id} className={`message ${message.role}`}>
                <div className="message-role">
                  {message.role === 'user' ? 'You' : 'Claude'}
                </div>
                {renderMessageContent(message)}
              </div>
            ))}

            {isLoading && (
              <div className="message assistant">
                <div className="message-role">Claude</div>
                <div className="message-text typing-indicator">
                  <span></span><span></span><span></span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="chat-input-area">
            <textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message... (Press Enter to send, Shift+Enter for new line)"
              className="chat-input"
              rows={3}
              disabled={isLoading}
            />
            <button
              onClick={sendMessage}
              disabled={isLoading || !inputMessage.trim()}
              className="send-btn"
            >
              {isLoading ? 'Sending...' : 'Send'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
