import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function translateText(text: string, from: string, to: string) {
  if (!text.trim()) return "";
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Translate the following text from ${from} to ${to}. Return ONLY the translated text, no explanations or quotes: "${text}"`,
    });
    
    return response.text?.trim() || "";
  } catch (error) {
    console.error("Translation error:", error);
    return text; // Fallback to original text
  }
}
