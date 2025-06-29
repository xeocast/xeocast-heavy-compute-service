import { z } from 'zod';
import type { Context } from 'hono';
import {
  generateArticleMetadataRoute,
  GenerateArticleMetadataRequestSchema,
  GenerateArticleMetadataResponseSchema,
} from '../../../schemas/ai.schemas.js';
import { GoogleGenAI, Type } from '@google/genai';

export const generateArticleMetadataHandler = async (
  c: Context<
    { Variables: {} },
    typeof generateArticleMetadataRoute.path,
    { out: { json: z.infer<typeof GenerateArticleMetadataRequestSchema> } }
  >
) => {
  const validatedBody = (c.req as any).valid('json') as z.infer<typeof GenerateArticleMetadataRequestSchema>;

  if (!validatedBody) {
    return c.json({ error: 'Invalid request body' }, 400);
  }

  const { prompt, article, model } = validatedBody;

  // Check if GEMINI_API_KEY is set.
  if (!process.env.GEMINI_API_KEY) {
    return c.json({ error: 'GEMINI_API_KEY is not configured' }, 500);
  }

  const genAI = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
  });

  const fullPrompt = (str: string) =>
    str.replace(/\{ ?articleContent ?\}/g, article);

  const aiModel = model || "gemini-2.5-flash-preview-05-20";

  const aiResponse = await genAI.models.generateContent({
    model: aiModel,
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
    return c.json({ error: 'Failed to generate content' }, 500);
  }

  let parsedResult;
  try {
    parsedResult = JSON.parse(metaJsonString);
  } catch (e) {
    console.error('Generated metadata is not valid JSON:', metaJsonString, e);
    return c.json({ error: 'Generated metadata is not valid JSON' }, 500);
  }

  const response: z.infer<typeof GenerateArticleMetadataResponseSchema> = {
    result: parsedResult,
    status: 'success',
  };
  return c.json(response, 200);
};
