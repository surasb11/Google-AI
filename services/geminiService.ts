
import { GoogleGenAI } from "@google/genai";

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const analyzeChanges = async (left: string, right: string): Promise<string> => {
  const ai = getAI();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Compare these two versions of text/code and provide a concise summary of the key changes. 
      Version A:
      ${left}
      
      Version B:
      ${right}
      
      Focus only on the logic or content shifts. Keep it under 100 words.`,
      config: {
        temperature: 0.2,
      }
    });
    
    return response.text || "No summary available.";
  } catch (error) {
    console.error("AI Analysis Error:", error);
    return "Failed to generate AI summary.";
  }
};
