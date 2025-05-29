import { z } from 'zod';
import type { Context } from 'hono';
import {
  generateEvergreenTitlesRoute,
  BaseGeminiRequestSchema,
  BaseGeminiResponseSchema,
} from '../../schemas/geminiSchemas';

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
  console.log(`Received prompt for evergreen titles: "${prompt}"`);

  const response: z.infer<typeof BaseGeminiResponseSchema> = {
    result: `Placeholder for evergreen titles from prompt: "${prompt}"`,
    status: 'success',
  };
  return c.json(response, 200);
};
