import { Bot, Plus, Send, Sparkles, X } from 'lucide-react';
import { lazy, Suspense, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { formatMessageTime } from '../hooks/useRafaelChat';

const ReactMarkdown = lazy(() => import('react-markdown'));

export default function RafaelChatWidget({ activeTab, chat, nearbyCafes, savedCafes, userLocation, userInitials = 'JD' }) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [launcherPosition, setLauncherPosition] = useState(null);
  const [panelPosition, setPanelPosition] = useState(null);
  const [isDraggingLauncher, setIsDraggingLauncher] = useState(false);
  const launcherDragRef = useRef(null);
  const launcherRef = useRef(null);
  const panelRef = useRef(null);
  const messagesEndRef = useRef(null);
  const activeConversation = chat.activeConversation;
  const messages = activeConversation.messages;
  const isThinking = chat.pendingConversationIds.includes(activeConversation.id);
  const isAvailable = ['discover', 'saved', 'map'].includes(activeTab);

  useEffect(() => {
    if (isOpen) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [isOpen, messages, isThinking]);

  useLayoutEffect(() => {
    if (!isOpen || !launcherPosition) return undefined;

    const positionPanel = () => {
      const launcherBounds = launcherRef.current.getBoundingClientRect();
      const panel = panelRef.current;
      panel.style.height = '';
      panel.style.minHeight = '';
      const panelBounds = panel.getBoundingClientRect();
      const margin = 16;
      const gap = 12;
      const left = Math.max(margin, Math.min(
        launcherBounds.left + launcherBounds.width / 2 - panelBounds.width / 2,
        window.innerWidth - panelBounds.width - margin,
      ));
      const spaceAbove = launcherBounds.top - gap - margin;
      const spaceBelow = window.innerHeight - launcherBounds.bottom - gap - margin;
      const placeAbove = spaceAbove >= panelBounds.height || spaceAbove >= spaceBelow;
      const height = Math.max(0, Math.min(panelBounds.height, placeAbove ? spaceAbove : spaceBelow));
      const top = placeAbove ? launcherBounds.top - gap - height : launcherBounds.bottom + gap;
      setPanelPosition({ left, top: Math.max(margin, top), height });
    };

    positionPanel();
    window.addEventListener('resize', positionPanel);
    return () => window.removeEventListener('resize', positionPanel);
  }, [isOpen, launcherPosition]);

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

  const clampLauncherPosition = (left, top) => {
    const launcher = launcherRef.current;
    const maxLeft = window.innerWidth - (launcher?.offsetWidth ?? 54);
    const maxTop = window.innerHeight - (launcher?.offsetHeight ?? 54);
    return {
      left: Math.max(0, Math.min(left, maxLeft)),
      top: Math.max(0, Math.min(top, maxTop)),
    };
  };

  const handleLauncherPointerDown = (event) => {
    if (isOpen || event.button !== 0) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    launcherDragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      left: bounds.left,
      top: bounds.top,
      moved: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleLauncherPointerMove = (event) => {
    if (isOpen) return;
    const drag = launcherDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const deltaX = event.clientX - drag.startX;
    const deltaY = event.clientY - drag.startY;
    if (!drag.moved && Math.hypot(deltaX, deltaY) < 4) return;
    drag.moved = true;
    setIsDraggingLauncher(true);
    setLauncherPosition(clampLauncherPosition(drag.left + deltaX, drag.top + deltaY));
  };

  const finishLauncherDrag = (event) => {
    if (launcherDragRef.current?.pointerId !== event.pointerId) return;
    launcherDragRef.current.pointerId = null;
    setIsDraggingLauncher(false);
  };

  const moveLauncherWithKeyboard = (event) => {
    if (isOpen) return;
    const directions = { ArrowUp: [0, -12], ArrowDown: [0, 12], ArrowLeft: [-12, 0], ArrowRight: [12, 0] };
    const direction = directions[event.key];
    if (!direction) return;
    event.preventDefault();
    const bounds = launcherRef.current.getBoundingClientRect();
    setLauncherPosition(clampLauncherPosition(bounds.left + direction[0], bounds.top + direction[1]));
  };

  return <>
    <button
      ref={launcherRef}
      className={`rafael-chat-launcher${isDraggingLauncher ? ' is-dragging' : ''}${isOpen ? ' is-open' : ''}`}
      style={launcherPosition ? { left: launcherPosition.left, top: launcherPosition.top, right: 'auto', bottom: 'auto' } : undefined}
      onClick={() => {
        if (launcherDragRef.current?.moved) {
          launcherDragRef.current.moved = false;
          return;
        }
        setIsOpen((open) => !open);
      }}
      onKeyDown={moveLauncherWithKeyboard}
      onPointerDown={handleLauncherPointerDown}
      onPointerMove={handleLauncherPointerMove}
      onPointerUp={finishLauncherDrag}
      onPointerCancel={finishLauncherDrag}
      aria-label={isOpen ? 'Close Rafael chat' : 'Chat with Rafael'}
      aria-expanded={isOpen}
      title={isOpen ? 'Close Rafael chat' : 'Drag to move; click to chat'}
    >
      {isOpen ? <X size={21} /> : <Sparkles size={22} />}
    </button>
    {isOpen && <section
      ref={panelRef}
      className="rafael-widget-panel"
      style={launcherPosition && panelPosition ? { left: panelPosition.left, top: panelPosition.top, right: 'auto', bottom: 'auto', height: panelPosition.height, minHeight: 0 } : undefined}
      aria-label="Chat with Rafael"
    >
      <header className="rafael-widget-header">
        <span className="rafael-widget-avatar"><Bot size={17} /></span>
        <span className="rafael-widget-title"><strong>Rafael</strong><small>{activeConversation.title}</small></span>
        <button className="rafael-widget-new" onClick={startNewConversation} aria-label="Start a new conversation" title="New chat"><Plus size={17} /></button>
        <button className="rafael-widget-close" onClick={() => setIsOpen(false)} aria-label="Close Rafael chat"><X size={17} /></button>
      </header>
      <div className="ai-messages rafael-widget-messages">
        {messages.map((message) => <div className={`ai-message ${message.role}`} key={message.id}>
          <div className="ai-message-avatar">{message.role === 'assistant' ? <Sparkles size={12} /> : userInitials}</div>
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