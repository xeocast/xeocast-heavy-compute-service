// import { GoogleGenAI } from "@google/genai";
import { updateTask } from "../../task.service.js";

export async function generateImageWithGemini(taskId: string, prompt: string, requestedModel?: string) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      console.error(`Task ${taskId}: GEMINI_API_KEY is not configured.`);
      updateTask(taskId, 'FAILED', { error: { message: 'GEMINI_API_KEY is not configured' } });
      return;
    }

    console.log(prompt, requestedModel)

    // const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    // const aiModelName = requestedModel || "gemini-2.5-flash-preview-05-20";

    // Placeholder for actual image generation logic
    // In a real scenario, this would call a specific image generation model
    // and return a URL to the generated image.
    const imageUrl = `https://example.com/generated-image-${taskId}.png`;

    const resultPayload = {
      imageUrl: imageUrl,
      status: 'success',
    };
    updateTask(taskId, 'COMPLETED', { result: resultPayload });

  } catch (error: any) {
    console.error(`Task ${taskId}: Error during Gemini image generation: ${error.message}`, error);
    updateTask(taskId, 'FAILED', { error: { message: error.message || 'Unknown error during image generation', details: error.stack || error.toString() } });
  }
}
