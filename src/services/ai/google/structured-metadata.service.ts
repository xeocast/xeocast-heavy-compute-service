import { GoogleGenAI, Type } from "@google/genai";
import { updateTask } from "../../task.service.js";

export async function generateStructuredMetadataWithGemini(taskId: string, prompt: string, article: string, requestedModel?: string) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      console.error(`Task ${taskId}: GEMINI_API_KEY is not configured.`);
      updateTask(taskId, 'FAILED', { error: { message: 'GEMINI_API_KEY is not configured' } });
      return;
    }

    const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const aiModelName = requestedModel || "gemini-2.5-flash-preview-05-20";

    const fullPrompt = (str: string) =>
      str.replace(/\{ ?articleContent ?\}/g, article);

    const aiResponse = await genAI.models.generateContent({
      model: aiModelName,
      contents: [
        { role: "user", parts: [{ text: fullPrompt(prompt) }] }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            description: {
              type: Type.STRING,
            },
            tags: {
              type: Type.ARRAY,
              items: {
                type: Type.STRING,
              },
            },
            thumbnailPrompt: {
              type: Type.STRING,
            },
            articleImagePrompt: {
              type: Type.STRING,
            },
          },
          propertyOrdering: ["description", "tags", "thumbnailPrompt", "articleImagePrompt"],
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
      console.error(`Task ${taskId}: Generated metadata is not valid JSON: ${metaJsonString}`, e);
      updateTask(taskId, 'FAILED', { error: { message: 'Generated metadata is not valid JSON', details: e.message } });
      return;
    }

    const resultPayload = {
      result: parsedResult,
      status: 'success',
    };
    updateTask(taskId, 'COMPLETED', { result: resultPayload });

  } catch (error: any) {
    console.error(`Task ${taskId}: Error during metadata generation: ${error.message}`, error);
    updateTask(taskId, 'FAILED', {
      error: {
        message: error.message || 'Unknown error during metadata generation',
        details: error.stack || error.toString(),
      },
    });
  }
}
