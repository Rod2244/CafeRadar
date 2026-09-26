import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';

app.use(cors());
app.use(express.json());

// Keep Gemini credentials on the server; never expose them to the frontend.
const ai = process.env.GEMINI_API_KEY
  ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
  : null;

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Backend is running!' });
});

// AI Assistant Endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { message, userLocation, nearbyCafes, savedCafes, conversationHistory } = req.body;

    if (typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: 'A non-empty message is required.' });
    }
    if (!ai) {
      return res.status(503).json({ error: 'Gemini is not configured on the backend.' });
    }

    const priorTurns = Array.isArray(conversationHistory)
      ? conversationHistory.slice(-20).flatMap((turn) => {
        if (!['user', 'model'].includes(turn?.role) || typeof turn.text !== 'string' || !turn.text.trim()) return [];
        return [{ role: turn.role, parts: [{ text: turn.text.trim() }] }];
      })
      : [];

    // Build context-aware system instructions
    const systemInstruction = `
      You are "Barista Bot", an intelligent AI assistant inside a Coffee Shop Finder app.
      
      CONTEXT:
      - User's Current GPS Location: ${JSON.stringify(userLocation || 'Unknown')}
      - Coffee Shops currently visible near user: ${JSON.stringify(nearbyCafes || [])}
      - Cafes saved by user: ${JSON.stringify(savedCafes || [])}
      
      RULES:
      1. Help the user choose or filter cafes based on their needs (e.g., fast Wi-Fi, study spots, outdoor seating, specialty espresso).
      2. Only claim a cafe has a feature, rating, or opening status when that information is provided.
      3. If nearby cafes are provided, prioritize recommending spots from that list.
      4. Keep your answers concise, friendly, and structured (use bullet points or bold text).
      5. If no cafes match, say so and suggest general tips or expanding their search radius.
    `;

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [...priorTurns, { role: 'user', parts: [{ text: message.trim() }] }],
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.7,
      }
    });

    res.json({ reply: response.text });
  } catch (error) {
    console.error('Gemini API request failed:', error.status || 'unknown status', error.message);
    const errorMessage = error.status === 404
      ? 'The configured Gemini model is unavailable. Check GEMINI_MODEL in the backend configuration.'
      : error.status === 401 || error.status === 403
        ? 'Gemini rejected the backend API key. Verify GEMINI_API_KEY in backend configuration.'
        : error.status === 429
          ? 'Gemini quota or rate limit reached. Check the API project quota and try again.'
          : error.status === 503
            ? 'Gemini is temporarily experiencing high demand. Please try again shortly.'
          : 'Gemini could not complete the request. Check the backend log for details.';
    res.status(502).json({ error: errorMessage });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server listening on http://localhost:${PORT}`);
});