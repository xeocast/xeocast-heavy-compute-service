import { z } from 'zod';
import type { Context } from 'hono'; // Use base Hono Context due to @hono/zod-openapi type resolution issues
import {
  generateArticleRoute, // Import the route definition
  GenerateArticleRequestSchema, // Keep for z.infer on response or if needed elsewhere
  GenerateArticleResponseSchema,
} from '../../schemas/geminiSchemas';
import { GoogleGenAI } from '@google/genai';

// This is a skeleton handler. Implement the actual Gemini API call here.
export const generateArticleHandler = async (
  c: Context<
    { Variables: {} }, // Environment type, can be more specific if needed
    typeof generateArticleRoute.path, // Path from your route definition
    { out: { json: z.infer<typeof GenerateArticleRequestSchema> } } // Explicit Input type for c.req.valid('json')
  >
) => {
  // The zValidator middleware (configured in geminiRoutes.ts)
  // processes the request. We cast c.req.valid('json') to the expected type.
  // Workaround for persistent 'assignable to never' error on c.req.valid('json')
  const validatedBody = (c.req as any).valid('json') as z.infer<typeof GenerateArticleRequestSchema>;

  // Ensure validatedBody is not undefined if the cast is too optimistic
  // or if middleware didn't run as expected (though zValidator throws on error)
  if (!validatedBody) {
    // This case should ideally be handled by zValidator throwing an error
    // or by more robust error handling if the middleware setup is complex.
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


  // Simulate Gemini API call or other heavy computation
  console.log(`Received prompt for content generation: "${prompt}"`);
  const generatedText = aiResponse.text;

  if (!generatedText) {
    return c.json({ error: 'Failed to generate content' }, 500);
  }

  // Return response conforming to GenerateArticleResponseSchema
  const response: z.infer<typeof GenerateArticleResponseSchema> = {
    generatedText: generatedText,
    status: 'success',
  };
  return c.json(response, 200);
};
