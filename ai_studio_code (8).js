import { GoogleGenAI, Modality } from '@google/genai';
import { Voice, Emotion } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateSpeech = async (
  text: string,
  voice: Voice,
  emotion: Emotion
): Promise<string> => {
  try {
    // Extract the base voice name from the enum value.
    // e.g., 'Kore_neutral' -> 'Kore'
    const voiceName = (voice as string).split('_')[0];

    const prompt = `Say ${emotion}: ${text}`;
    
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            // Use the extracted base voice name
            prebuiltVoiceConfig: { voiceName: voiceName },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    if (!base64Audio) {
      throw new Error("No audio data received from API.");
    }
    
    return base64Audio;
  } catch (error) {
    console.error("Error generating speech with Gemini API:", error);
    throw new Error("Failed to generate speech.");
  }
};