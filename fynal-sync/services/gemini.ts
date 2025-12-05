import { GoogleGenAI } from "@google/genai";

// Ideally, this should be in an env var, but for the purpose of this component generation
// we rely on the environment being set up correctly or the user checking this.
const API_KEY = process.env.API_KEY || '';

let ai: GoogleGenAI | null = null;

if (API_KEY) {
  ai = new GoogleGenAI({ apiKey: API_KEY });
}

export const generateAIResponse = async (prompt: string, context?: string): Promise<string> => {
  if (!ai) {
    return "Gemini API Key is missing. Please configure the environment.";
  }

  try {
    const model = 'gemini-2.5-flash';
    const finalPrompt = context 
      ? `Context: ${context}\n\nUser Question: ${prompt}\n\nAnswer concisely.`
      : prompt;

    const response = await ai.models.generateContent({
      model,
      contents: finalPrompt,
    });
    
    return response.text || "I couldn't generate a response.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Sorry, I encountered an error while processing your request.";
  }
};
