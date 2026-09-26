import { useEffect, useRef, useState } from 'react';

const CONVERSATION_STORAGE_KEY = 'caferadar-rafael-conversations';
const WELCOME_TEXT = 'Hello, I am Rafael. Tell me what your workday needs, and I will help you find the right cafe.';

function createConversation() {
  const now = new Date().toISOString();
  const id = globalThis.crypto?.randomUUID?.() || `conversation-${now}`;
  return {
    id,
    title: 'New conversation',
    createdAt: now,
    updatedAt: now,
    messages: [{ id: `${id}-welcome`, role: 'assistant', text: WELCOME_TEXT, time: now }],
  };
}

function loadConversationHistory() {
  try {
    const saved = JSON.parse(window.localStorage.getItem(CONVERSATION_STORAGE_KEY));
    const conversations = Array.isArray(saved?.conversations)
      ? saved.conversations.filter((conversation) => conversation
        && typeof conversation.id === 'string'
        && Array.isArray(conversation.messages)
        && conversation.messages.every((message) => message
          && ['user', 'assistant'].includes(message.role)
          && typeof message.text === 'string'))
      : [];

    if (conversations.length) {
      const activeId = conversations.some((conversation) => conversation.id === saved.activeConversationId)
        ? saved.activeConversationId
        : conversations[0].id;
      return { conversations, activeConversationId: activeId };
    }
  } catch {
    // Start a fresh local history if stored data is unavailable or invalid.
  }

  const initialConversation = createConversation();
  return { conversations: [initialConversation], activeConversationId: initialConversation.id };
}

function appendMessage(setHistory, conversationId, message) {
  setHistory((current) => ({
    ...current,
    conversations: current.conversations
      .map((conversation) => conversation.id === conversationId
        ? { ...conversation, updatedAt: message.time, messages: [...conversation.messages, message] }
        : conversation)
      .sort((first, second) => new Date(second.updatedAt) - new Date(first.updatedAt)),
  }));
}

function getCafeContext(cafes = []) {
  return cafes.map(({ name, address, distance, isOpen, rating, wifiSpeed, outlets, noiseLevel, amenities }) => ({
    name, address, distance, isOpen, rating, wifiSpeed, outlets, noiseLevel, amenities,
  }));
}

export function formatMessageTime(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Now' : new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(date);
}

export function formatConversationDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : new Intl.DateTimeFormat(undefined, { dateStyle: 'short', timeStyle: 'short' }).format(date);
}

export default function useRafaelChat() {
  const [history, setHistory] = useState(loadConversationHistory);
  const [pendingConversationIds, setPendingConversationIds] = useState([]);
  const pendingRequests = useRef(new Set());
  const activeConversation = history.conversations.find((conversation) => conversation.id === history.activeConversationId)
    || history.conversations[0];

  useEffect(() => {
    try {
      window.localStorage.setItem(CONVERSATION_STORAGE_KEY, JSON.stringify(history));
    } catch {
      // Keep the current conversation usable if browser storage is unavailable.
    }
  }, [history]);

  const startNewConversation = () => {
    const conversation = createConversation();
    setHistory((current) => ({
      conversations: [conversation, ...current.conversations],
      activeConversationId: conversation.id,
    }));
    return conversation.id;
  };

  const openConversation = (conversationId) => {
    if (!history.conversations.some((conversation) => conversation.id === conversationId)) return;
    setHistory((current) => ({ ...current, activeConversationId: conversationId }));
  };

  const sendMessage = async (text, context, targetConversationId = activeConversation.id) => {
    const question = text.trim();
    const conversation = history.conversations.find((item) => item.id === targetConversationId);
    if (!question || !conversation || pendingRequests.current.has(targetConversationId)) return null;

    pendingRequests.current.add(targetConversationId);
    setPendingConversationIds((current) => [...current, targetConversationId]);

    const timestamp = new Date().toISOString();
    const userMessage = { id: `user-${timestamp}`, role: 'user', text: question, time: timestamp };
    setHistory((current) => ({
      ...current,
      conversations: current.conversations
        .map((item) => item.id === targetConversationId
          ? {
            ...item,
            title: item.messages.some((message) => message.role === 'user') ? item.title : question.slice(0, 42),
            updatedAt: timestamp,
            messages: [...item.messages, userMessage],
          }
          : item)
        .sort((first, second) => new Date(second.updatedAt) - new Date(first.updatedAt)),
    }));

    try {
      const conversationHistory = conversation.messages
        .filter((message, index) => index > 0 || message.role === 'user')
        .slice(-20)
        .map((message) => ({ role: message.role === 'assistant' ? 'model' : 'user', text: message.text }));
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: question,
          userLocation: context.userLocation,
          conversationHistory,
          nearbyCafes: getCafeContext(context.nearbyCafes),
          savedCafes: getCafeContext(context.savedCafes),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'The assistant request failed.');
      const reply = typeof result.reply === 'string' && result.reply.trim()
        ? result.reply.trim()
        : 'I could not generate a reply just now. Please try again.';
      appendMessage(setHistory, targetConversationId, {
        id: `assistant-${new Date().toISOString()}`,
        role: 'assistant',
        text: reply,
        time: new Date().toISOString(),
      });
      return { reply, success: true };
    } catch (error) {
      const reply = error instanceof TypeError
        ? 'I could not reach the CafeRadar server. Make sure the backend is running, then try again.'
        : `I could not get a Gemini response: ${error.message}`;
      const replyTime = new Date().toISOString();
      appendMessage(setHistory, targetConversationId, {
        id: `assistant-${replyTime}`,
        role: 'assistant',
        text: reply,
        time: replyTime,
      });
      return { reply, success: false };
    } finally {
      pendingRequests.current.delete(targetConversationId);
      setPendingConversationIds((current) => current.filter((id) => id !== targetConversationId));
    }
  };

  return {
    conversations: history.conversations,
    activeConversation,
    pendingConversationIds,
    startNewConversation,
    openConversation,
    sendMessage,
  };
}