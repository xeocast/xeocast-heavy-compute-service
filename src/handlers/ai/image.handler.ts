import { z } from 'zod';
import type { Context } from 'hono';
import {
  BaseAIRequestSchema,
  GenerateImageResponseSchema,
} from '../../schemas/ai.schemas.js';
import { GoogleGenAI } from '@google/genai';
import { generateThumbnailImageRoute } from '../../routes/ai.routes.js';

export const generateThumbnailImageHandler = async (
  c: Context<
    { Variables: {} },
    typeof generateThumbnailImageRoute.path,
    { out: { json: z.infer<typeof BaseAIRequestSchema> } }
  >
) => {
  const validatedBody = (c.req as any).valid('json') as z.infer<typeof BaseAIRequestSchema>;

  if (!validatedBody) {
    return c.json({ error: 'Invalid request body' }, 400);
  }

  const { prompt } = validatedBody;

  // Check if GEMINI_API_KEY is set.
  if (!process.env.GEMINI_API_KEY) {
    return c.json({ error: 'GEMINI_API_KEY is not configured' }, 500);
  }

  const genAI = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
  });

  const aiResponse = await genAI.models.generateContent({
    model: "gemini-2.0-flash",
    contents: prompt,
  });


  const generatedText = aiResponse.text;

  if (!generatedText) {
    return c.json({ error: 'Failed to generate content' }, 500);
  }
  
  const response: z.infer<typeof GenerateImageResponseSchema> = {
    imageUrl: `https://example.com/placeholder-thumbnail-for-prompt.png`,
    status: 'success',
  };
  return c.json(response, 200);
};
