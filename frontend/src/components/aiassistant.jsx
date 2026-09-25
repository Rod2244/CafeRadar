import { Bot, Clock3, Mic, MicOff, Send, Sparkles, Volume2, Wifi, Zap } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

const SUGGESTIONS = ['Find a quiet cafe with fast WiFi', 'Which spot is best for a 3-hour work session?', 'Compare my saved cafes'];

export default function AIAssistant() {
  const [messages, setMessages] = useState([{ id: 'welcome', role: 'assistant', text: 'Hello, I am Rafael. Tell me what your workday needs, and I will help you find the right cafe.', time: 'Now' }]);
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const recognitionRef = useRef(null);

  const supportsSpeech = typeof window !== 'undefined' && 'speechSynthesis' in window;

  useEffect(() => () => { recognitionRef.current?.stop(); window.speechSynthesis?.cancel(); }, []);

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

  const createReply = (question) => {
    const normalized = question.toLowerCase();
    if (normalized.includes('quiet') || normalized.includes('focus')) return 'For deep focus, start with Artisan Roast & Byte. It has a quiet vibe, plentiful outlets, and verified 180 Mbps WiFi. I would book the morning window before the lunch rush.';
    if (normalized.includes('compare') || normalized.includes('saved')) return 'Your saved collection has one cafe ready for a focused session. Artisan Roast & Byte is the strongest match for speed, quiet, and power access.';
    if (normalized.includes('wifi') || normalized.includes('internet')) return 'Brew & Code Hub has the fastest connection at 320 Mbps. It is a little more energetic, so I would choose it for calls or upload-heavy work.';
    return 'I can help you match a cafe to your workday. Try telling me your ideal noise level, WiFi needs, distance, or how long you plan to stay.';
  };

  const sendMessage = (event, suggestedText = input) => {
    event?.preventDefault();
    const question = suggestedText.trim();
    if (!question || isThinking) return;
    setMessages((current) => [...current, { id: `user-${Date.now()}`, role: 'user', text: question, time: 'Just now' }]);
    setInput('');
    setIsThinking(true);
    window.setTimeout(() => {
      const reply = createReply(question);
      setMessages((current) => [...current, { id: `assistant-${Date.now()}`, role: 'assistant', text: reply, time: 'Just now' }]);
      speakReply(reply);
      setIsThinking(false);
    }, 650);
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
    <div className="ai-heading"><div><span className="eyebrow">Your workday intelligence</span><h1>Ask Rafael</h1><p>A calm second mind for finding your next work-ready cafe.</p></div><div className="ai-online"><span /> Rafael is online</div></div>
    <div className="ai-layout">
      <div className="ai-chat-panel">
        <div className="ai-chat-header"><div className="rafael-avatar"><Sparkles size={19} /></div><div><strong>Rafael</strong><span>{isSpeaking ? 'Speaking your recommendation...' : 'Workday cafe intelligence'}</span></div><button className={`ai-audio-button ${voiceEnabled ? 'active' : ''}`} onClick={toggleVoice} disabled={!supportsSpeech} aria-label={voiceEnabled ? 'Turn off Rafael voice' : 'Turn on Rafael voice'} title={supportsSpeech ? (voiceEnabled ? 'Turn off Rafael voice' : 'Turn on Rafael voice') : 'Voice playback unavailable'}><Volume2 size={16} /></button></div>
        <div className="ai-messages">{messages.map((message) => <div className={`ai-message ${message.role}`} key={message.id}><div className="ai-message-avatar">{message.role === 'assistant' ? <Sparkles size={13} /> : 'JD'}</div><div><p>{message.text}</p><small>{message.time}</small></div></div>)}{isThinking && <div className="ai-message assistant"><div className="ai-message-avatar"><Sparkles size={13} /></div><div className="ai-thinking"><span /><span /><span /></div></div>}</div>
        <div className="ai-composer"><div className="ai-suggestions">{SUGGESTIONS.map((suggestion) => <button key={suggestion} onClick={() => sendMessage(null, suggestion)}>{suggestion}</button>)}</div><form onSubmit={sendMessage}><input value={input} onChange={(event) => setInput(event.target.value)} placeholder="Ask Rafael about your next workday..." aria-label="Ask Rafael a question" /><button type="button" className={`ai-mic ${isListening ? 'active' : ''}`} onClick={toggleListening} disabled={!supportsVoice} aria-label={supportsVoice ? 'Use voice input' : 'Voice input unavailable'} title={supportsVoice ? 'Use voice input' : 'Voice input unavailable'}>{isListening ? <MicOff size={17} /> : <Mic size={17} />}</button><button type="submit" className="ai-send" aria-label="Send question"><Send size={16} /></button></form>{isListening && <small className="listening-note">Listening... speak your question</small>}{!supportsVoice && <small className="listening-note">Voice input is not supported in this browser.</small>}</div>
      </div>
      <aside className="ai-context-panel"><RafaelOrb /><div className="ai-context-heading"><span><Bot size={16} /> Rafael's read</span><small>Based on your radar</small></div><div className="ai-read-card"><strong>Best current match</strong><h2>Artisan Roast & Byte</h2><p>Quiet, fast, and ready for a long focus block.</p><div className="ai-read-metrics"><span><Wifi size={13} /> 180 Mbps</span><span><Zap size={13} /> Outlets</span><span><Clock3 size={13} /> Morning</span></div></div><div className="ai-context-note"><Sparkles size={15} /><p>Rafael learns from your saved cafes, filters, and workday preferences in this session.</p></div></aside>
    </div>
  </section>;
}

function RafaelOrb() {
  return <div className="rafael-orb" role="img" aria-label="Rafael is active"><div className="orb-aura" /><div className="orb-glyphs glyphs-one">R · A · F · A · E · L</div><div className="orb-glyphs glyphs-two">01 10 01 11 00 10</div><div className="orb-ring ring-one" /><div className="orb-ring ring-two" /><div className="orb-ring ring-three" /><div className="orb-sweep" /><div className="orb-core"><Sparkles size={27} /></div><span className="orb-spark spark-one" /><span className="orb-spark spark-two" /><span className="orb-spark spark-three" /></div>;
}