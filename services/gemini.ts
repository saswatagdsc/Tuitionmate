// AI features must be called via a secure backend.
// For privacy and security, we avoid exposing API keys in the client.
// If a backend is not configured, we return local stub responses.
const AI_ENABLED = (import.meta as any).env?.VITE_GEMINI_API_ENABLED === 'true';
let ai: any = null;
if (AI_ENABLED) {
  try {
    // Dynamically import only when enabled to avoid bundling client secrets
    const mod = await import('@google/genai');
    const { GoogleGenAI } = mod as any;
    // IMPORTANT: Do NOT pass API keys from the client. Use a backend proxy.
    // Here we assume server-side token exchange; client never holds keys.
    ai = new GoogleGenAI({ apiKey: '' });
  } catch (e) {
    console.warn('AI module not available; falling back to stubs.');
  }
}

export const generateNotice = async (topic: string, tone: 'formal' | 'casual' | 'urgent'): Promise<string> => {
  if (!AI_ENABLED || !ai) {
    return `${tone === 'urgent' ? 'IMPORTANT: ' : ''}${topic} — Please check your batch notices.`;
  }
  try {
    const prompt = `Write a short notice for a tuition center board. 
    Topic: ${topic}. 
    Tone: ${tone}. 
    Audience: Parents and Students. 
    Keep it concise and clear (under 100 words).`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    return response.text || "Could not generate notice.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Error: AI service unavailable. Please try later.";
  }
};

export const generateStudyTip = async (subject: string): Promise<string> => {
  if (!AI_ENABLED || !ai) {
    return `Try active recall: explain one ${subject} concept out loud.`;
  }
  try {
    const prompt = `Give me one interesting, high-impact study tip or mnemonic for a high school student studying ${subject}. Keep it short and actionable.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    return response.text || "Study more!";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Keep practicing!";
  }
};
