import { Bookmark, Bot, Clock3, LocateFixed, Mic, MicOff, Plus, Send, Sparkles, Volume2 } from 'lucide-react';
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { formatConversationDate, formatMessageTime } from '../hooks/useRafaelChat';

const ReactMarkdown = lazy(() => import('react-markdown'));

const SUGGESTIONS = ['Find a quiet cafe with fast WiFi', 'Which spot is best for a 3-hour work session?', 'Compare my saved cafes'];

export default function AIAssistant({ chat, nearbyCafes = [], savedCafes = [], userLocation = null }) {
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const recognitionRef = useRef(null);
  const activeConversation = chat.activeConversation;
  const messages = activeConversation.messages;
  const isThinking = chat.pendingConversationIds.includes(activeConversation.id);

  const supportsSpeech = typeof window !== 'undefined' && 'speechSynthesis' in window;

  useEffect(() => () => { recognitionRef.current?.stop(); window.speechSynthesis?.cancel(); }, []);

  const startNewConversation = () => {
    chat.startNewConversation();
    setIsHistoryOpen(false);
    setInput('');
  };

  const openConversation = (conversationId) => {
    chat.openConversation(conversationId);
    setIsHistoryOpen(false);
  };

  const speakReply = (text) => {
    if (!voiceEnabled || !supportsSpeech) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.97;
    utterance.pitch = 1.05;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  const toggleVoice = () => {
    if (!supportsSpeech) return;
    if (voiceEnabled) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
    setVoiceEnabled((current) => !current);
  };

  const sendMessage = async (event, suggestedText = input) => {
    event?.preventDefault();
    const question = suggestedText.trim();
    if (!question || isThinking) return;
    setInput('');
    const result = await chat.sendMessage(question, { userLocation, nearbyCafes, savedCafes }, activeConversation.id);
    if (result?.success) speakReply(result.reply);
  };

  const toggleListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.onresult = ({ results }) => setInput((current) => `${current} ${results[0][0].transcript}`.trim());
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  };

  const supportsVoice = typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  return <section className="ai-page">
    <div className="ai-heading"><div><span className="eyebrow">Your workday intelligence</span><h1>Ask Rafael</h1><p>A calm second mind for finding your next work-ready cafe.</p></div><div className="ai-online"><span /> Gemini assistant</div></div>
    <div className="ai-layout">
      <div className="ai-chat-panel">
        <div className="ai-chat-header"><div className="rafael-avatar"><Sparkles size={19} /></div><div><strong>Rafael</strong><span>{isSpeaking ? 'Speaking your recommendation...' : 'Workday cafe intelligence'}</span></div><button className={`ai-audio-button ${voiceEnabled ? 'active' : ''}`} onClick={toggleVoice} disabled={!supportsSpeech} aria-label={voiceEnabled ? 'Turn off Rafael voice' : 'Turn on Rafael voice'} title={supportsSpeech ? (voiceEnabled ? 'Turn off Rafael voice' : 'Turn on Rafael voice') : 'Voice playback unavailable'}><Volume2 size={16} /></button></div>
        <div className="ai-thread-toolbar">
          <button className="ai-thread-button" onClick={startNewConversation}><Plus size={14} /> New chat</button>
          <button className="ai-thread-button" onClick={() => setIsHistoryOpen((open) => !open)} aria-expanded={isHistoryOpen}><Clock3 size={14} /> History <span>{chat.conversations.length}</span></button>
          {isHistoryOpen && <div className="ai-history-list" aria-label="Previous conversations">
            {chat.conversations.map((conversation) => <button key={conversation.id} className={conversation.id === activeConversation.id ? 'active' : ''} onClick={() => openConversation(conversation.id)}>
              <strong>{conversation.title}</strong><small>{formatConversationDate(conversation.updatedAt)} · {conversation.messages.length} messages</small>
            </button>)}
          </div>}
        </div>
        <div className="ai-messages">{messages.map((message) => <div className={`ai-message ${message.role}`} key={message.id}><div className="ai-message-avatar">{message.role === 'assistant' ? <Sparkles size={13} /> : 'JD'}</div><div><div className="ai-message-content">{message.role === 'assistant' ? <Suspense fallback={null}><ReactMarkdown>{message.text}</ReactMarkdown></Suspense> : message.text}</div><small>{formatMessageTime(message.time)}</small></div></div>)}{isThinking && <div className="ai-message assistant"><div className="ai-message-avatar"><Sparkles size={13} /></div><div className="ai-thinking"><span /><span /><span /></div></div>}</div>
        <div className="ai-composer"><div className="ai-suggestions">{SUGGESTIONS.map((suggestion) => <button key={suggestion} onClick={() => sendMessage(null, suggestion)}>{suggestion}</button>)}</div><form onSubmit={sendMessage}><input value={input} onChange={(event) => setInput(event.target.value)} placeholder="Ask Rafael about your next workday..." aria-label="Ask Rafael a question" /><button type="button" className={`ai-mic ${isListening ? 'active' : ''}`} onClick={toggleListening} disabled={!supportsVoice} aria-label={supportsVoice ? 'Use voice input' : 'Voice input unavailable'} title={supportsVoice ? 'Use voice input' : 'Voice input unavailable'}>{isListening ? <MicOff size={17} /> : <Mic size={17} />}</button><button type="submit" className="ai-send" aria-label="Send question"><Send size={16} /></button></form>{isListening && <small className="listening-note">Listening... speak your question</small>}{!supportsVoice && <small className="listening-note">Voice input is not supported in this browser.</small>}</div>
      </div>
      <aside className="ai-context-panel"><RafaelOrb /><div className="ai-context-heading"><span><Bot size={16} /> Rafael's read</span><small>Based on your radar</small></div><div className="ai-read-card"><strong>{savedCafes.length ? 'Saved cafe' : 'Nearby cafe'}</strong><h2>{savedCafes[0]?.name || nearbyCafes[0]?.name || 'No cafes in range'}</h2><p>{savedCafes[0]?.address || nearbyCafes[0]?.address || 'Allow location access or expand the scan radius to find cafes.'}</p><div className="ai-read-metrics"><span><LocateFixed size={13} /> {nearbyCafes.length} nearby</span><span><Bookmark size={13} /> {savedCafes.length} saved</span>{userLocation && <span>{userLocation.lat.toFixed(3)}, {userLocation.lng.toFixed(3)}</span>}</div></div><div className="ai-context-note"><Sparkles size={15} /><p>Rafael receives your saved cafes and available nearby cafe details with each question.</p></div></aside>
    </div>
  </section>;
}

function RafaelOrb() {
  return <div className="rafael-orb" role="img" aria-label="Rafael is active"><div className="orb-aura" /><div className="orb-glyphs glyphs-one">R · A · F · A · E · L</div><div className="orb-glyphs glyphs-two">01 10 01 11 00 10</div><div className="orb-ring ring-one" /><div className="orb-ring ring-two" /><div className="orb-ring ring-three" /><div className="orb-sweep" /><div className="orb-core"><Sparkles size={27} /></div><span className="orb-spark spark-one" /><span className="orb-spark spark-two" /><span className="orb-spark spark-three" /></div>;
}