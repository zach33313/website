# Frontend UI Research: AI Chat Assistant Character

## Project Context
- **Website aesthetic**: Matrix/cyberpunk green (#00ff41) on black
- **Existing patterns**: The site already uses Rive for the StandingPerson component
- **CSS Variables available**: `--matrix-green`, `--matrix-green-dim`, `--matrix-green-glow`, `--background-black`

---

## 1. CHARACTER ANIMATION OPTIONS

### Option A: CSS-Only Stick Figure (Recommended for Simplicity)

A CSS-only approach using SVG with CSS keyframe animations. This keeps bundle size small and avoids additional dependencies.

**Pros:**
- Zero additional dependencies
- Full control over styling to match theme
- Easy to implement idle/speaking states via CSS classes
- Performance-friendly

**Cons:**
- Limited animation complexity
- More manual work for smooth transitions

**Example: Simple Matrix-Style Stick Figure**
```css
/* Stick figure made of CSS shapes */
.ai-character {
  position: relative;
  width: 60px;
  height: 100px;
  cursor: pointer;
  filter: drop-shadow(0 0 8px var(--matrix-green-glow));
}

/* Head */
.ai-character__head {
  width: 20px;
  height: 20px;
  border: 2px solid var(--matrix-green);
  border-radius: 50%;
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  animation: idle-head 3s ease-in-out infinite;
}

/* Body */
.ai-character__body {
  width: 2px;
  height: 30px;
  background: var(--matrix-green);
  position: absolute;
  top: 22px;
  left: 50%;
  transform: translateX(-50%);
}

/* Arms */
.ai-character__arms {
  width: 40px;
  height: 2px;
  background: var(--matrix-green);
  position: absolute;
  top: 30px;
  left: 50%;
  transform: translateX(-50%);
}

/* Legs */
.ai-character__left-leg,
.ai-character__right-leg {
  width: 2px;
  height: 25px;
  background: var(--matrix-green);
  position: absolute;
  top: 52px;
  transform-origin: top center;
}

.ai-character__left-leg {
  left: calc(50% - 8px);
  transform: rotate(-15deg);
}

.ai-character__right-leg {
  left: calc(50% + 6px);
  transform: rotate(15deg);
}

/* Idle animation - subtle breathing/swaying */
@keyframes idle-head {
  0%, 100% { transform: translateX(-50%) translateY(0); }
  50% { transform: translateX(-50%) translateY(-2px); }
}

@keyframes idle-body {
  0%, 100% { transform: translateX(-50%) scaleY(1); }
  50% { transform: translateX(-50%) scaleY(1.02); }
}

/* Speaking state - head bobs, body glows brighter */
.ai-character.speaking .ai-character__head {
  animation: speaking-head 0.3s ease-in-out infinite;
  box-shadow: 0 0 15px var(--matrix-green-glow);
}

@keyframes speaking-head {
  0%, 100% { transform: translateX(-50%) translateY(0) scale(1); }
  50% { transform: translateX(-50%) translateY(-3px) scale(1.05); }
}

/* Thinking state - subtle pulsing glow */
.ai-character.thinking {
  animation: thinking-pulse 1.5s ease-in-out infinite;
}

@keyframes thinking-pulse {
  0%, 100% { filter: drop-shadow(0 0 8px var(--matrix-green-glow)); }
  50% { filter: drop-shadow(0 0 20px var(--matrix-green-glow)) brightness(1.2); }
}

/* Attention-seeking pulse for clickability */
.ai-character:not(.chat-open) {
  animation: attention-pulse 2s ease-in-out infinite;
}

@keyframes attention-pulse {
  0%, 100% {
    transform: scale(1);
    filter: drop-shadow(0 0 8px var(--matrix-green-glow));
  }
  50% {
    transform: scale(1.05);
    filter: drop-shadow(0 0 15px var(--matrix-green-glow));
  }
}
```

### Option B: SVG Animation (Best Balance)

Create an SVG character with grouped elements for each body part, then animate with CSS.

**Example SVG Structure:**
```jsx
const AICharacterSVG = ({ state = 'idle' }) => (
  <svg
    viewBox="0 0 60 100"
    className={`ai-character ai-character--${state}`}
    style={{
      width: '60px',
      height: '100px',
      filter: 'drop-shadow(0 0 8px rgba(0, 255, 65, 0.6))'
    }}
  >
    {/* Head */}
    <circle
      cx="30" cy="12" r="10"
      fill="none"
      stroke="#00ff41"
      strokeWidth="2"
      className="ai-head"
    />

    {/* Eyes - for expression */}
    <circle cx="26" cy="10" r="2" fill="#00ff41" className="ai-eye ai-eye--left" />
    <circle cx="34" cy="10" r="2" fill="#00ff41" className="ai-eye ai-eye--right" />

    {/* Body */}
    <line x1="30" y1="22" x2="30" y2="55" stroke="#00ff41" strokeWidth="2" />

    {/* Arms */}
    <g className="ai-arms">
      <line x1="30" y1="32" x2="15" y2="45" stroke="#00ff41" strokeWidth="2" />
      <line x1="30" y1="32" x2="45" y2="45" stroke="#00ff41" strokeWidth="2" />
    </g>

    {/* Legs */}
    <g className="ai-legs">
      <line x1="30" y1="55" x2="20" y2="85" stroke="#00ff41" strokeWidth="2" />
      <line x1="30" y1="55" x2="40" y2="85" stroke="#00ff41" strokeWidth="2" />
    </g>

    {/* Speech indicator (hidden by default) */}
    <g className="ai-speech-indicator" opacity="0">
      <circle cx="50" cy="8" r="3" fill="#00ff41" />
      <circle cx="55" cy="12" r="2" fill="#00ff41" />
      <circle cx="58" cy="18" r="1.5" fill="#00ff41" />
    </g>
  </svg>
);
```

### Option C: Rive Animation (Already in Use)

Since the project already uses Rive for `StandingPerson`, extending this approach is natural.

**Rive State Machine Setup:**
1. Create states: Idle, Speaking, Thinking, Wave
2. Use boolean inputs: `isSpeaking`, `isThinking`
3. Trigger inputs: `wave` (for attention-getting)

**React Integration:**
```jsx
import { useRive, useStateMachineInput } from '@rive-app/react-canvas';

const AICharacter = ({ isSpeaking, isThinking, onClick }) => {
  const { rive, RiveComponent } = useRive({
    src: '/ai-assistant.riv',
    stateMachines: 'Main',
    autoplay: true,
  });

  const speakingInput = useStateMachineInput(rive, 'Main', 'isSpeaking');
  const thinkingInput = useStateMachineInput(rive, 'Main', 'isThinking');

  useEffect(() => {
    if (speakingInput) speakingInput.value = isSpeaking;
    if (thinkingInput) thinkingInput.value = isThinking;
  }, [isSpeaking, isThinking, speakingInput, thinkingInput]);

  return (
    <div onClick={onClick} style={{ cursor: 'pointer' }}>
      <RiveComponent style={{ width: 80, height: 120 }} />
    </div>
  );
};
```

### What Makes a Character Feel "Inviting" and Clickable

1. **Constant subtle motion** - Never fully static (breathing, blinking, slight sway)
2. **Attention-seeking pulse** - Gentle scale/glow animation every few seconds
3. **Hover feedback** - Brighten glow, slight scale increase, maybe a wave
4. **Clear positioning** - Bottom-right corner is conventional for chat widgets
5. **Speech bubble hint** - Small "?" or "..." bubble near character when idle
6. **Friendly proportions** - Larger head relative to body feels more approachable

---

## 2. CHAT UI PATTERNS

### Layout ASCII Mockup

```
+--------------------------------------------------+
|                    WEBSITE                        |
|                                                   |
|                                                   |
|                                                   |
|                                                   |
|                                                   |
|                                                   |
|                        +-----------------------+  |
|                        |  AI CHAT ASSISTANT    |  |
|                        |-----------------------|  |
|                        | > How can I help?     |  |
|                        |                       |  |
|                        | [ User message... ]   |  |
|                        |                       |  |
|                        | > Response with       |  |
|                        |   matrix glow...      |  |
|                        |                       |  |
|                        |-----------------------|  |
|                        | [Ask me anything...] >|  |
|    [AI]                +-----------------------+  |
|    /_\                                            |
+--------------------------------------------------+
```

### Floating Chat Widget Structure

```jsx
// ChatWidget.js - Component Structure
const ChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  return (
    <div className="chat-widget-container">
      {/* Character (always visible) */}
      <AICharacter
        onClick={() => setIsOpen(!isOpen)}
        isSpeaking={isLoading}
        state={isOpen ? 'active' : 'idle'}
      />

      {/* Chat Panel (slides in/out) */}
      {isOpen && (
        <div className="chat-panel">
          <ChatHeader onClose={() => setIsOpen(false)} />
          <ChatMessages messages={messages} isLoading={isLoading} />
          <ChatInput
            value={input}
            onChange={setInput}
            onSubmit={handleSubmit}
            disabled={isLoading}
          />
        </div>
      )}
    </div>
  );
};
```

### Cyberpunk Chat Panel CSS

```css
/* Chat Container - Fixed Position */
.chat-widget-container {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 9000;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 12px;
}

/* Chat Panel */
.chat-panel {
  width: 380px;
  max-width: calc(100vw - 40px);
  height: 500px;
  max-height: 70vh;
  background: rgba(0, 0, 0, 0.95);
  border: 1px solid var(--matrix-green);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: slideIn 0.3s ease-out;
  box-shadow:
    0 0 20px rgba(0, 255, 65, 0.3),
    inset 0 0 50px rgba(0, 255, 65, 0.05);
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* Header */
.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid var(--matrix-green-dim);
  background: rgba(0, 255, 65, 0.05);
}

.chat-header__title {
  color: var(--matrix-green);
  font-family: 'Courier New', monospace;
  font-size: 14px;
  text-transform: uppercase;
  letter-spacing: 2px;
  text-shadow: 0 0 10px var(--matrix-green-glow);
}

.chat-header__close {
  background: transparent;
  border: 1px solid var(--matrix-green-dim);
  color: var(--matrix-green);
  width: 28px;
  height: 28px;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.chat-header__close:hover {
  background: rgba(0, 255, 65, 0.2);
  border-color: var(--matrix-green);
}

/* Messages Area */
.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* Message Bubbles */
.chat-message {
  max-width: 85%;
  padding: 10px 14px;
  border-radius: 12px;
  font-family: 'Courier New', monospace;
  font-size: 14px;
  line-height: 1.5;
  animation: messageIn 0.3s ease-out;
}

@keyframes messageIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* User messages - right aligned */
.chat-message--user {
  align-self: flex-end;
  background: rgba(0, 255, 65, 0.15);
  border: 1px solid var(--matrix-green-dim);
  color: var(--matrix-green);
}

/* AI messages - left aligned with glow */
.chat-message--ai {
  align-self: flex-start;
  background: rgba(0, 0, 0, 0.8);
  border: 1px solid var(--matrix-green);
  color: var(--matrix-green);
  box-shadow: 0 0 15px rgba(0, 255, 65, 0.2);
}

/* Terminal-style prefix */
.chat-message--ai::before {
  content: '> ';
  color: var(--matrix-green-dim);
}

/* Typing Indicator */
.typing-indicator {
  display: flex;
  gap: 4px;
  padding: 12px 14px;
  align-self: flex-start;
}

.typing-indicator__dot {
  width: 8px;
  height: 8px;
  background: var(--matrix-green);
  border-radius: 50%;
  animation: typingBounce 1.4s ease-in-out infinite;
  box-shadow: 0 0 8px var(--matrix-green-glow);
}

.typing-indicator__dot:nth-child(2) {
  animation-delay: 0.2s;
}

.typing-indicator__dot:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes typingBounce {
  0%, 60%, 100% { transform: translateY(0); }
  30% { transform: translateY(-8px); }
}

/* Input Area */
.chat-input-container {
  padding: 12px;
  border-top: 1px solid var(--matrix-green-dim);
  background: rgba(0, 255, 65, 0.02);
}

.chat-input-wrapper {
  display: flex;
  gap: 8px;
  align-items: flex-end;
}

.chat-input {
  flex: 1;
  background: rgba(0, 0, 0, 0.6);
  border: 1px solid var(--matrix-green-dim);
  border-radius: 6px;
  padding: 10px 14px;
  color: var(--matrix-green);
  font-family: 'Courier New', monospace;
  font-size: 14px;
  resize: none;
  min-height: 40px;
  max-height: 100px;
  outline: none;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.chat-input::placeholder {
  color: var(--matrix-green-dim);
  opacity: 0.6;
}

.chat-input:focus {
  border-color: var(--matrix-green);
  box-shadow: 0 0 10px rgba(0, 255, 65, 0.3);
}

/* Send Button */
.chat-send-btn {
  background: rgba(0, 255, 65, 0.1);
  border: 1px solid var(--matrix-green);
  color: var(--matrix-green);
  width: 40px;
  height: 40px;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.chat-send-btn:hover:not(:disabled) {
  background: rgba(0, 255, 65, 0.2);
  box-shadow: 0 0 15px var(--matrix-green-glow);
}

.chat-send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Scanline overlay on chat panel */
.chat-panel::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  background: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 2px,
    rgba(0, 0, 0, 0.03) 2px,
    rgba(0, 0, 0, 0.03) 4px
  );
  z-index: 1;
}
```

### Multi-line Response Handling

```css
/* Support for code blocks in responses */
.chat-message pre {
  background: rgba(0, 0, 0, 0.5);
  border: 1px solid var(--matrix-green-dim);
  border-radius: 4px;
  padding: 10px;
  overflow-x: auto;
  margin: 8px 0;
  font-size: 12px;
}

.chat-message code {
  color: #00cc33;
  font-family: 'Courier New', monospace;
}

/* Lists in responses */
.chat-message ul, .chat-message ol {
  margin: 8px 0;
  padding-left: 20px;
}

.chat-message li {
  margin: 4px 0;
}

.chat-message li::marker {
  color: var(--matrix-green);
}
```

---

## 3. UX CONSIDERATIONS

### Making It Clear This Is an AI Assistant

1. **Header label**: "AI ASSISTANT" or "ASK AI" with terminal aesthetic
2. **Initial greeting**: "SYSTEM INITIALIZED. How can I help you learn about Zach's work?"
3. **Prompt suggestions**: Show clickable example questions
4. **AI badge/icon**: Small "AI" label near character

### Placeholder Text Suggestions

```
"Ask me anything about Zach's projects..."
"What would you like to know?"
"Type your question here..."
"Try: 'Tell me about the Amazon project'"
```

### Example Questions (Prompt Chips)

Display these as clickable chips in the empty chat state:

```jsx
const EXAMPLE_QUESTIONS = [
  "What technologies does Zach know?",
  "Tell me about the Amazon project",
  "What AI/ML experience does he have?",
  "How can I contact Zach?",
];

const ExampleQuestions = ({ onSelect }) => (
  <div className="example-questions">
    <p className="example-questions__label">Try asking:</p>
    <div className="example-questions__chips">
      {EXAMPLE_QUESTIONS.map((q, i) => (
        <button
          key={i}
          className="example-chip"
          onClick={() => onSelect(q)}
        >
          {q}
        </button>
      ))}
    </div>
  </div>
);
```

```css
.example-questions {
  padding: 16px;
  text-align: center;
}

.example-questions__label {
  color: var(--matrix-green-dim);
  font-size: 12px;
  margin-bottom: 12px;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.example-chip {
  background: transparent;
  border: 1px solid var(--matrix-green-dim);
  color: var(--matrix-green);
  padding: 8px 12px;
  margin: 4px;
  border-radius: 16px;
  font-family: 'Courier New', monospace;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.example-chip:hover {
  background: rgba(0, 255, 65, 0.15);
  border-color: var(--matrix-green);
  box-shadow: 0 0 10px rgba(0, 255, 65, 0.3);
}
```

### Error State Handling

```jsx
const ErrorMessage = ({ error, onRetry }) => (
  <div className="chat-error">
    <span className="chat-error__icon">!</span>
    <span className="chat-error__text">
      {error || "Connection lost. The matrix has you..."}
    </span>
    <button className="chat-error__retry" onClick={onRetry}>
      Retry
    </button>
  </div>
);
```

```css
.chat-error {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: rgba(255, 0, 0, 0.1);
  border: 1px solid #ff4444;
  border-radius: 8px;
  color: #ff4444;
  font-size: 13px;
}

.chat-error__icon {
  width: 20px;
  height: 20px;
  border: 2px solid #ff4444;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
}

.chat-error__retry {
  margin-left: auto;
  background: transparent;
  border: 1px solid #ff4444;
  color: #ff4444;
  padding: 4px 10px;
  border-radius: 4px;
  cursor: pointer;
  font-family: 'Courier New', monospace;
  font-size: 12px;
}

.chat-error__retry:hover {
  background: rgba(255, 68, 68, 0.2);
}
```

### Mobile Responsive Considerations

```css
/* Mobile adjustments */
@media (max-width: 480px) {
  .chat-widget-container {
    bottom: 10px;
    right: 10px;
    left: 10px;
  }

  .chat-panel {
    width: 100%;
    max-width: none;
    height: calc(100vh - 120px);
    max-height: none;
    border-radius: 12px 12px 0 0;
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
  }

  /* Adjust for mobile keyboard */
  .chat-panel.keyboard-open {
    height: calc(100vh - 120px - env(keyboard-inset-height, 0px));
  }

  .ai-character-container {
    position: fixed;
    bottom: 10px;
    right: 10px;
  }
}

/* Handle iOS safe areas */
.chat-input-container {
  padding-bottom: calc(12px + env(safe-area-inset-bottom, 0px));
}
```

---

## 4. IMPLEMENTATION PATTERNS

### React Component Structure

```
src/
  components/
    ChatWidget/
      ChatWidget.js          # Main container component
      ChatWidget.css         # All styles
      ChatHeader.js          # Header with title and close
      ChatMessages.js        # Message list with scroll
      ChatInput.js           # Input field and send button
      ChatMessage.js         # Individual message bubble
      TypingIndicator.js     # Animated dots
      ExampleQuestions.js    # Prompt chips
      AICharacter.js         # The clickable character
      useChatState.js        # Custom hook for state management
```

### State Management with useReducer

```jsx
// useChatState.js
import { useReducer, useCallback } from 'react';

const initialState = {
  isOpen: false,
  messages: [],
  input: '',
  status: 'idle', // 'idle' | 'loading' | 'error'
  error: null,
};

function chatReducer(state, action) {
  switch (action.type) {
    case 'TOGGLE_CHAT':
      return { ...state, isOpen: !state.isOpen };

    case 'OPEN_CHAT':
      return { ...state, isOpen: true };

    case 'CLOSE_CHAT':
      return { ...state, isOpen: false };

    case 'SET_INPUT':
      return { ...state, input: action.payload };

    case 'SEND_MESSAGE':
      return {
        ...state,
        messages: [...state.messages, { role: 'user', content: action.payload }],
        input: '',
        status: 'loading',
        error: null,
      };

    case 'RECEIVE_MESSAGE':
      return {
        ...state,
        messages: [...state.messages, { role: 'assistant', content: action.payload }],
        status: 'idle',
      };

    case 'SET_ERROR':
      return {
        ...state,
        status: 'error',
        error: action.payload,
      };

    case 'CLEAR_ERROR':
      return {
        ...state,
        status: 'idle',
        error: null,
      };

    default:
      return state;
  }
}

export function useChatState() {
  const [state, dispatch] = useReducer(chatReducer, initialState);

  const toggleChat = useCallback(() => dispatch({ type: 'TOGGLE_CHAT' }), []);
  const openChat = useCallback(() => dispatch({ type: 'OPEN_CHAT' }), []);
  const closeChat = useCallback(() => dispatch({ type: 'CLOSE_CHAT' }), []);
  const setInput = useCallback((value) => dispatch({ type: 'SET_INPUT', payload: value }), []);

  const sendMessage = useCallback(async (content) => {
    dispatch({ type: 'SEND_MESSAGE', payload: content });

    try {
      // API call here
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: content }),
      });

      if (!response.ok) throw new Error('Failed to get response');

      const data = await response.json();
      dispatch({ type: 'RECEIVE_MESSAGE', payload: data.response });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
    }
  }, []);

  return {
    ...state,
    toggleChat,
    openChat,
    closeChat,
    setInput,
    sendMessage,
    clearError: () => dispatch({ type: 'CLEAR_ERROR' }),
  };
}
```

### Keyboard Accessibility

```jsx
// ChatInput.js
const ChatInput = ({ value, onChange, onSubmit, disabled }) => {
  const textareaRef = useRef(null);

  const handleKeyDown = (e) => {
    // Enter to submit (without Shift for multiline)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (value.trim() && !disabled) {
        onSubmit(value);
      }
    }
  };

  return (
    <div className="chat-input-container">
      <textarea
        ref={textareaRef}
        className="chat-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Ask me anything..."
        disabled={disabled}
        rows={1}
        aria-label="Chat message input"
      />
      <button
        className="chat-send-btn"
        onClick={() => onSubmit(value)}
        disabled={disabled || !value.trim()}
        aria-label="Send message"
      >
        <SendIcon />
      </button>
    </div>
  );
};

// ChatWidget.js - Escape to close
useEffect(() => {
  const handleEscape = (e) => {
    if (e.key === 'Escape' && isOpen) {
      closeChat();
    }
  };

  document.addEventListener('keydown', handleEscape);
  return () => document.removeEventListener('keydown', handleEscape);
}, [isOpen, closeChat]);
```

### Animation with Framer Motion

```jsx
import { motion, AnimatePresence } from 'framer-motion';

const ChatPanel = ({ isOpen, children }) => (
  <AnimatePresence>
    {isOpen && (
      <motion.div
        className="chat-panel"
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
      >
        {children}
      </motion.div>
    )}
  </AnimatePresence>
);

// Message animation
const ChatMessage = ({ message, index }) => (
  <motion.div
    className={`chat-message chat-message--${message.role}`}
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.05 }}
  >
    {message.content}
  </motion.div>
);

// Typing indicator
const TypingIndicator = () => (
  <motion.div
    className="typing-indicator"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
  >
    {[0, 1, 2].map((i) => (
      <motion.div
        key={i}
        className="typing-indicator__dot"
        animate={{ y: [0, -8, 0] }}
        transition={{
          duration: 0.6,
          repeat: Infinity,
          delay: i * 0.15,
        }}
      />
    ))}
  </motion.div>
);
```

---

## 5. VISUAL DESIGN - CYBERPUNK/MATRIX EFFECTS

### Neon Glow Text Effect

```css
.neon-text {
  color: #00ff41;
  text-shadow:
    0 0 5px #fff,
    0 0 10px #fff,
    0 0 20px #00ff41,
    0 0 30px #00ff41,
    0 0 40px #00ff41;
}

/* Animated neon flicker */
.neon-flicker {
  animation: neonFlicker 3s infinite;
}

@keyframes neonFlicker {
  0%, 19%, 21%, 23%, 25%, 54%, 56%, 100% {
    text-shadow:
      0 0 5px #fff,
      0 0 10px #fff,
      0 0 20px #00ff41,
      0 0 30px #00ff41,
      0 0 40px #00ff41;
  }
  20%, 24%, 55% {
    text-shadow: none;
  }
}
```

### Scanline Effect

```css
.scanlines {
  position: relative;
}

.scanlines::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  background: repeating-linear-gradient(
    0deg,
    rgba(0, 0, 0, 0.15),
    rgba(0, 0, 0, 0.15) 1px,
    transparent 1px,
    transparent 2px
  );
  z-index: 10;
}

/* Moving scanline */
.scanlines::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(
    to bottom,
    transparent,
    rgba(0, 255, 65, 0.2),
    transparent
  );
  animation: scanlineMove 8s linear infinite;
  pointer-events: none;
  z-index: 11;
}

@keyframes scanlineMove {
  0% { top: -4px; }
  100% { top: 100%; }
}
```

### Terminal Cursor Blink

```css
.terminal-cursor {
  display: inline-block;
  width: 10px;
  height: 18px;
  background: #00ff41;
  animation: cursorBlink 1s step-end infinite;
  margin-left: 2px;
  vertical-align: text-bottom;
}

@keyframes cursorBlink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}
```

### Glitch Effect

```css
.glitch {
  position: relative;
}

.glitch::before,
.glitch::after {
  content: attr(data-text);
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.glitch::before {
  left: 2px;
  text-shadow: -2px 0 #ff00ff;
  clip: rect(24px, 550px, 90px, 0);
  animation: glitch-anim 3s infinite linear alternate-reverse;
}

.glitch::after {
  left: -2px;
  text-shadow: -2px 0 #00ffff;
  clip: rect(85px, 550px, 140px, 0);
  animation: glitch-anim 2s infinite linear alternate-reverse;
}

@keyframes glitch-anim {
  0% { clip: rect(51px, 9999px, 28px, 0); }
  10% { clip: rect(70px, 9999px, 63px, 0); }
  20% { clip: rect(20px, 9999px, 92px, 0); }
  30% { clip: rect(10px, 9999px, 20px, 0); }
  40% { clip: rect(56px, 9999px, 89px, 0); }
  50% { clip: rect(35px, 9999px, 16px, 0); }
  60% { clip: rect(90px, 9999px, 60px, 0); }
  70% { clip: rect(27px, 9999px, 70px, 0); }
  80% { clip: rect(61px, 9999px, 43px, 0); }
  90% { clip: rect(14px, 9999px, 87px, 0); }
  100% { clip: rect(43px, 9999px, 52px, 0); }
}
```

### CRT Screen Curvature (Optional)

```css
.crt-curve {
  border-radius: 20px;
  overflow: hidden;
  transform: perspective(500px) rotateX(2deg);
  box-shadow:
    inset 0 0 50px rgba(0, 255, 65, 0.1),
    0 0 30px rgba(0, 255, 65, 0.2);
}
```

---

## 6. RECOMMENDATIONS

### Character Design Approach

**Recommended: SVG + CSS Animation**

Given the existing Matrix aesthetic and the goal of keeping things lightweight:

1. Create a simple stick figure SVG (head, body, arms, legs)
2. Add "eyes" as small circles for expression
3. Use CSS animations for:
   - Idle: Subtle breathing/sway
   - Speaking: Head bob + eye animation + brighter glow
   - Thinking: Pulsing glow
   - Attention: Scale pulse when chat is closed

4. Include a small speech bubble indicator that fades in/out

### Animation Library Choice

**Recommended: CSS animations for simple states, Framer Motion for panel transitions**

- CSS handles character animations (lighter weight, matches existing patterns)
- Framer Motion handles chat panel open/close and message entry (smoother, more control)

### File Structure

```
src/
  components/
    ChatWidget/
      index.js                # Export
      ChatWidget.js           # Main component
      ChatWidget.css          # Styles
      AICharacter.js          # SVG character component
      AICharacter.css         # Character animations
      components/
        ChatHeader.js
        ChatMessages.js
        ChatInput.js
        TypingIndicator.js
        ExampleQuestions.js
      hooks/
        useChatState.js       # State management
        useAutoScroll.js      # Scroll to bottom on new messages
```

### Key Implementation Notes

1. **Position**: Fixed bottom-right, character always visible, panel slides up
2. **Z-index**: High enough to overlay everything (z-index: 9000+)
3. **Mobile**: Full-width panel on mobile, handle keyboard properly
4. **Performance**: Use `will-change: transform` on animated elements
5. **Accessibility**: Proper ARIA labels, keyboard navigation, focus management

---

## Sources

- [Floating UI React Documentation](https://floating-ui.com/docs/react)
- [Ably - How to Build a Live Chat Widget in React](https://ably.com/blog/how-to-build-a-live-chat-widget-in-react-creation)
- [CYBERCORE CSS Framework](https://dev.to/sebyx07/introducing-cybercore-css-a-cyberpunk-design-framework-for-futuristic-uis-2e6c)
- [Recreating Cyberpunk 2077 UI Elements](https://www.csskitsune.com/blog/recreating-cyberpunk-2077-ui-elements)
- [CSS-Tricks: How to Animate SVG with CSS](https://css-tricks.com/animating-svg-css/)
- [LogRocket: How to Animate SVG with CSS](https://blog.logrocket.com/how-to-animate-svg-css-tutorial-examples/)
- [Rive React Documentation](https://rive.app/docs/runtimes/react/react)
- [Codrops: Integrating Rive into React](https://tympanus.net/codrops/2025/05/12/integrating-rive-into-a-react-project-behind-the-scenes-of-valley-adventures/)
- [Motion.dev: Typewriter Animation](https://motion.dev/docs/react-typewriter)
- [DEV.to: Retro CRT Terminal Screen](https://dev.to/ekeijl/retro-crt-terminal-screen-in-css-js-4afh)
- [CSS-Tricks: Create Neon Text with CSS](https://css-tricks.com/how-to-create-neon-text-with-css/)
- [W3Schools: Glowing Text Effect](https://www.w3schools.com/howto/howto_css_glowing_text.asp)
- [Animate.css Library](https://animate.style/)
- [NN/g: Prompt Controls in GenAI Chatbots](https://www.nngroup.com/articles/prompt-controls-genai/)
- [WillowTree: 7 UX/UI Rules for Conversational AI](https://www.willowtreeapps.com/insights/willowtrees-7-ux-ui-rules-for-designing-a-conversational-ai-assistant)
- [Sendbird: Chatbot UI Examples](https://sendbird.com/blog/chatbot-ui)
- [VirtualKeyboard API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/VirtualKeyboard_API)
- [LogRocket: React useReducer Guide](https://blog.logrocket.com/react-usereducer-hook-ultimate-guide/)
- [Rive vs Lottie Comparison](https://rive.app/blog/rive-as-a-lottie-alternative)
