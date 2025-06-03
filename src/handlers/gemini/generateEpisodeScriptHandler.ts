import { z } from 'zod';
import type { Context } from 'hono';
import {
  generateEpisodeScriptRoute,
  GenerateEpisodeScriptResponseSchema,
  GenerateEpisodeScriptRequestSchema,
} from '../../schemas/geminiSchemas';
import { GoogleGenAI, Type } from '@google/genai';

export const generateEpisodeScriptHandler = async (
  c: Context<
    { Variables: {} },
    typeof generateEpisodeScriptRoute.path,
    { 
      in: { json: z.infer<typeof GenerateEpisodeScriptRequestSchema> }, 
      out: { json: z.infer<typeof GenerateEpisodeScriptResponseSchema> } 
    }
  >
) => {
  const validatedBody = (c.req as any).valid('json') as z.infer<typeof GenerateEpisodeScriptRequestSchema>;

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
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            speaker: {
              type: Type.STRING,
            },
            line: {
              type: Type.STRING,
            }
          },
          required: ['speaker', 'line'],
          propertyOrdering: ['speaker', 'line'],
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

  const response: z.infer<typeof GenerateEpisodeScriptResponseSchema> = {
    result: parsedResult,
    status: 'success',
  };
  return c.json(response, 200);
};
