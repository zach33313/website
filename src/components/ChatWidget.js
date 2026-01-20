import React, { useState, useRef, useEffect, useCallback } from 'react';
import './ChatWidget.css';

// Chat API configuration
const API_BASE = process.env.REACT_APP_RAG_API_URL || 'http://localhost:8000';

// Initial suggested questions
const SUGGESTED_QUESTIONS = [
  "What are Zach's skills?",
  "Tell me about his experience",
  "What projects has he worked on?",
  "What's his tech stack?",
];

// Icons as inline SVG
const MessageIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="chat-toggle-icon">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

const CloseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="chat-toggle-icon">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const SendIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);

function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hey! I'm Zach's AI assistant. Ask me anything about his experience, projects, or skills!",
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Handle streaming response
  const handleStreamingResponse = useCallback(async (question) => {
    setIsLoading(true);
    setStreamingContent('');

    try {
      const response = await fetch(`${API_BASE}/api/ask/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              // Stream complete
              setMessages((prev) => [
                ...prev,
                { role: 'assistant', content: fullContent },
              ]);
              setStreamingContent('');
            } else {
              try {
                const parsed = JSON.parse(data);
                if (parsed.chunk) {
                  fullContent += parsed.chunk;
                  setStreamingContent(fullContent);
                }
              } catch (e) {
                // Ignore parse errors for partial chunks
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Stream error:', error);
      // Fallback to non-streaming
      try {
        const response = await fetch(`${API_BASE}/api/ask`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question }),
        });

        if (response.ok) {
          const data = await response.json();
          setMessages((prev) => [
            ...prev,
            { role: 'assistant', content: data.answer },
          ]);
        } else {
          setMessages((prev) => [
            ...prev,
            {
              role: 'assistant',
              content: "I'm having trouble connecting right now. Please try again later!",
            },
          ]);
        }
      } catch (fallbackError) {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: "I'm having trouble connecting right now. Please try again later!",
          },
        ]);
      }
    } finally {
      setIsLoading(false);
      setStreamingContent('');
    }
  }, []);

  // Handle send message
  const handleSend = useCallback(async (e) => {
    e?.preventDefault();
    const question = input.trim();
    if (!question || isLoading) return;

    // Add user message
    setMessages((prev) => [...prev, { role: 'user', content: question }]);
    setInput('');

    // Get streaming response
    await handleStreamingResponse(question);
  }, [input, isLoading, handleStreamingResponse]);

  // Handle suggested question click
  const handleSuggestedClick = useCallback((question) => {
    setMessages((prev) => [...prev, { role: 'user', content: question }]);
    handleStreamingResponse(question);
  }, [handleStreamingResponse]);

  return (
    <div className={`chat-widget-container ${isOpen ? 'open' : ''}`}>
      {/* Chat Window */}
      <div className="chat-window">
        {/* Header */}
        <div className="chat-header">
          <div className="chat-avatar">🤖</div>
          <div className="chat-header-info">
            <h3>Zach's AI Assistant</h3>
            <p>Powered by RAG</p>
          </div>
        </div>

        {/* Messages */}
        <div className="chat-messages">
          {messages.map((message, index) => (
            <div key={index} className={`chat-message ${message.role}`}>
              <div className="message-avatar">
                {message.role === 'assistant' ? '🤖' : '👤'}
              </div>
              <div className="message-content">{message.content}</div>
            </div>
          ))}

          {/* Streaming message */}
          {streamingContent && (
            <div className="chat-message assistant">
              <div className="message-avatar">🤖</div>
              <div className="message-content">
                {streamingContent}
                <span className="streaming-cursor" />
              </div>
            </div>
          )}

          {/* Loading indicator */}
          {isLoading && !streamingContent && (
            <div className="chat-message assistant">
              <div className="message-avatar">🤖</div>
              <div className="message-content">
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Questions (show only when few messages) */}
        {messages.length < 3 && !isLoading && (
          <div className="suggested-questions">
            {SUGGESTED_QUESTIONS.map((q, i) => (
              <button
                key={i}
                className="suggested-question"
                onClick={() => handleSuggestedClick(q)}
              >
                {q}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="chat-input-container">
          <form className="chat-input-form" onSubmit={handleSend}>
            <input
              ref={inputRef}
              type="text"
              className="chat-input"
              placeholder="Ask about Zach's experience..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isLoading}
            />
            <button
              type="submit"
              className="chat-send-button"
              disabled={!input.trim() || isLoading}
            >
              <SendIcon />
            </button>
          </form>
        </div>
      </div>

      {/* Toggle Button */}
      <button
        className="chat-toggle-button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? 'Close chat' : 'Open chat'}
      >
        {isOpen ? <CloseIcon /> : <MessageIcon />}
      </button>
    </div>
  );
}

export default ChatWidget;
