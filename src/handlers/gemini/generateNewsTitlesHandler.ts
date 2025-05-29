import { z } from 'zod';
import type { Context } from 'hono';
import {
  generateNewsTitlesRoute,
  BaseGeminiRequestSchema,
  BaseGeminiResponseSchema,
} from '../../schemas/geminiSchemas';

export const generateNewsTitlesHandler = async (
  c: Context<
    { Variables: {} },
    typeof generateNewsTitlesRoute.path,
    { out: { json: z.infer<typeof BaseGeminiRequestSchema> } }
  >
) => {
  const validatedBody = (c.req as any).valid('json') as z.infer<typeof BaseGeminiRequestSchema>;

  if (!validatedBody) {
    return c.json({ error: 'Invalid request body' }, 400);
  }

  const { prompt } = validatedBody;
  console.log(`Received prompt for news titles: "${prompt}"`);

  const response: z.infer<typeof BaseGeminiResponseSchema> = {
    result: `Placeholder for news titles from prompt: "${prompt}"`,
    status: 'success',
  };
  return c.json(response, 200);
};
