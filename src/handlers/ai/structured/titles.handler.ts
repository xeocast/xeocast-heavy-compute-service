import { z } from 'zod';
import type { Context } from 'hono';
import { RouteConfigToTypedResponse } from '@hono/zod-openapi';
import {
  StructuredTitlesRequestSchema,
  StructuredTitlesResponseSchema,
} from '../../../schemas/ai.schemas.js';
import { structuredTitlesRoute } from '../../../routes/ai.routes.js';
import { GoogleGenAI, Type } from '@google/genai';

export const titlesHandler = async (
  c: Context<
    { Variables: {} },
    typeof structuredTitlesRoute.path,
    { out: { json: z.infer<typeof StructuredTitlesRequestSchema> } }
  >
): Promise<RouteConfigToTypedResponse<typeof structuredTitlesRoute>> => {
  const { prompt, model } = c.req.valid('json');

  // Check if GEMINI_API_KEY is set.
  if (!process.env.GEMINI_API_KEY) {
    return c.json({ error: 'GEMINI_API_KEY is not configured' }, 500);
  }

  const genAI = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
  });

  const aiModel = model || "gemini-2.5-flash-preview-05-20";

  const aiResponse = await genAI.models.generateContent({
    model: aiModel,
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

  const response: z.infer<typeof StructuredTitlesResponseSchema> = {
    result: parsedResult,
    status: 'success',
  };
  return c.json(response, 200);
};
