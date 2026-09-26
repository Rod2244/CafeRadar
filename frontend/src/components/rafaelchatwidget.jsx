import { Bot, Plus, Send, Sparkles, X } from 'lucide-react';
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { formatMessageTime } from '../hooks/useRafaelChat';

const ReactMarkdown = lazy(() => import('react-markdown'));

export default function RafaelChatWidget({ activeTab, chat, nearbyCafes, savedCafes, userLocation }) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);
  const activeConversation = chat.activeConversation;
  const messages = activeConversation.messages;
  const isThinking = chat.pendingConversationIds.includes(activeConversation.id);
  const isAvailable = ['discover', 'saved', 'map'].includes(activeTab);

  useEffect(() => {
    if (isOpen) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [isOpen, messages, isThinking]);

  if (!isAvailable) return null;

  const startNewConversation = () => {
    chat.startNewConversation();
    setInput('');
  };

  const sendMessage = async (event) => {
    event.preventDefault();
    const question = input.trim();
    if (!question || isThinking) return;
    setInput('');
    await chat.sendMessage(question, { userLocation, nearbyCafes, savedCafes }, activeConversation.id);
  };

  return <>
    <button className="rafael-chat-launcher" onClick={() => setIsOpen((open) => !open)} aria-label={isOpen ? 'Close Rafael chat' : 'Chat with Rafael'} aria-expanded={isOpen} title="Chat with Rafael">
      {isOpen ? <X size={21} /> : <Sparkles size={22} />}
    </button>
    {isOpen && <section className="rafael-widget-panel" aria-label="Chat with Rafael">
      <header className="rafael-widget-header">
        <span className="rafael-widget-avatar"><Bot size={17} /></span>
        <span className="rafael-widget-title"><strong>Rafael</strong><small>{activeConversation.title}</small></span>
        <button className="rafael-widget-new" onClick={startNewConversation} aria-label="Start a new conversation" title="New chat"><Plus size={17} /></button>
        <button className="rafael-widget-close" onClick={() => setIsOpen(false)} aria-label="Close Rafael chat"><X size={17} /></button>
      </header>
      <div className="ai-messages rafael-widget-messages">
        {messages.map((message) => <div className={`ai-message ${message.role}`} key={message.id}>
          <div className="ai-message-avatar">{message.role === 'assistant' ? <Sparkles size={12} /> : 'JD'}</div>
          <div><div className="ai-message-content">{message.role === 'assistant' ? <Suspense fallback={null}><ReactMarkdown>{message.text}</ReactMarkdown></Suspense> : message.text}</div><small>{formatMessageTime(message.time)}</small></div>
        </div>)}
        {isThinking && <div className="ai-message assistant"><div className="ai-message-avatar"><Sparkles size={12} /></div><div className="ai-thinking"><span /><span /><span /></div></div>}
        <div ref={messagesEndRef} />
      </div>
      <form className="rafael-widget-composer" onSubmit={sendMessage}>
        <input value={input} onChange={(event) => setInput(event.target.value)} placeholder="Ask Rafael..." aria-label="Message Rafael" />
        <button type="submit" aria-label="Send message" disabled={!input.trim() || isThinking}><Send size={16} /></button>
      </form>
    </section>}
  </>;
}