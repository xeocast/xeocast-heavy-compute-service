import { z } from 'zod';
import type { Context } from 'hono';
import {
  generateEvergreenTitlesRoute,
  BaseGeminiRequestSchema,
  GenerateTitlesResponseSchema,
} from '../../schemas/geminiSchemas';
import { GoogleGenAI, Type } from '@google/genai';

export const generateEvergreenTitlesHandler = async (
  c: Context<
    { Variables: {} },
    typeof generateEvergreenTitlesRoute.path,
    { out: { json: z.infer<typeof BaseGeminiRequestSchema> } }
  >
) => {
  const validatedBody = (c.req as any).valid('json') as z.infer<typeof BaseGeminiRequestSchema>;

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
    contents: [
      { role: "user", parts: [{ text: prompt }] }
    ],
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
    return c.json({ error: 'Failed to generate content' }, 500);
  }

  let parsedResult;
  try {
    parsedResult = JSON.parse(metaJsonString);
  } catch (e) {
    console.error('Generated metadata is not valid JSON:', metaJsonString, e);
    return c.json({ error: 'Generated metadata is not valid JSON' }, 500);
  }

  const response: z.infer<typeof GenerateTitlesResponseSchema> = {
    result: parsedResult,
    status: 'success',
  };
  return c.json(response, 200);
};
