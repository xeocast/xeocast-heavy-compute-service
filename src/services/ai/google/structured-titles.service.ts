import { GoogleGenAI, Type } from "@google/genai";
import { updateTask } from "../../task.service.js";
import { StructuredTitlesResponseSchema } from "../../../schemas/ai.schemas.js";
import z from "zod";

export async function generateStructuredTitlesWithGemini(taskId: string, prompt: string, requestedModel?: string) {
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
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: {
                  type: Type.STRING,
                },
                description: {
                  type: Type.STRING,
                },
              },
              required: ['title', 'description'],
              propertyOrdering: ['title', 'description'],
            },
          },
        },
      });
  
      const metaJsonString = aiResponse.text;
  
      if (!metaJsonString) {
        console.error(`Task ${taskId}: Failed to generate content from Gemini. JSON string is null or undefined.`);
        updateTask(taskId, 'FAILED', { error: { message: 'Failed to generate content - JSON string is null or undefined' } });
        return;
      }
  
      let parsedResult;
      try {
        parsedResult = JSON.parse(metaJsonString);
      } catch (e: any) {
        console.error(`Task ${taskId}: Generated titles are not valid JSON: ${metaJsonString}`, e);
        updateTask(taskId, 'FAILED', { error: { message: 'Generated titles are not valid JSON', details: e.message } });
        return;
      }
  
      const resultPayload: z.infer<typeof StructuredTitlesResponseSchema> = {
        titles: parsedResult,
        status: 'success',
      };
      updateTask(taskId, 'COMPLETED', { result: resultPayload });
  
    } catch (error: any) {
      console.error(`Task ${taskId}: Error during structured titles generation: ${error.message}`, error);
      updateTask(taskId, 'FAILED', { error: { message: error.message || 'Unknown error during structured titles generation', details: error.stack || error.toString() } });
    }
  }
  