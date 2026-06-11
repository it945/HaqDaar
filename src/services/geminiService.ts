import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function askHaqDaarAssistant(question: string) {
  const prompt = `
    You are the "HaqDaar AI Assistant", a helpful guide for a social aid distribution platform in Pakistan.
    The user is a beneficiary seeking help.
    Your goal is to answer questions about:
    1. How to redeem aid at stores (using Scan & Pay).
    2. Explaining their current balance and disbursements.
    3. Guiding them to the right government schemes if they ask.
    4. General encouragement and polite support in the context of financial aid.
    
    Current User Context:
    - Name: Saifullah Al-Fassaad
    - Current Balance: PKR 15,000
    - Next disbursement: June 15, 2026
    
    User Question: "${question}"
    
    Respond in a helpful, respectful, and clear tone. Use simple language.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });
    return response.text || "I'm sorry, I couldn't generate a response.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "I'm sorry, I'm having trouble connecting to my knowledge base. Please try again later.";
  }
}
