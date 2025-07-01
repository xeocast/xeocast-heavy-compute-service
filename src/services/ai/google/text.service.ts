import { GoogleGenAI } from "@google/genai";
import { z } from 'zod';
import { updateTask } from "../../task.service.js";
import { TextResponseSchema } from "../../../schemas/ai.schemas.js";

export async function generateTextWithGemini(taskId: string, prompt: string, requestedModel?: string) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      console.error(`Task ${taskId}: GEMINI_API_KEY is not configured.`);
      updateTask(taskId, 'FAILED', { error: { message: 'GEMINI_API_KEY is not configured' } });
      return;
    }

    const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const aiModelName = requestedModel || "gemini-2.5-flash-preview-05-20";

    const aiResponse = await genAI.models.generateContent({
      model: aiModelName,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });

    const generatedText = aiResponse.text;

    if (generatedText == null) {
      console.error(`Task ${taskId}: Failed to generate content from Gemini. Text is null or undefined.`);
      updateTask(taskId, 'FAILED', { error: { message: 'Failed to generate content - text is null or undefined' } });
      return;
    }
    

    const resultPayload: z.infer<typeof TextResponseSchema> = {
      text: generatedText,
      status: 'success',
    };
    updateTask(taskId, 'COMPLETED', { result: resultPayload });

  } catch (error: any) {
    console.error(`Task ${taskId}: Error during Gemini text generation: ${error.message}`, error);
    updateTask(taskId, 'FAILED', { error: { message: error.message || 'Unknown error during text generation', details: error.stack || error.toString() } });
  }
}
