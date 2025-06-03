import { z } from 'zod';
import type { Context } from 'hono';
import {
  generateSeriesTitlesRoute,
  BaseGeminiRequestSchema,
  BaseGeminiResponseSchema,
} from '../../schemas/geminiSchemas';

export const generateSeriesTitlesHandler = async (
  c: Context<
    { Variables: {} },
    typeof generateSeriesTitlesRoute.path,
    { out: { json: z.infer<typeof BaseGeminiRequestSchema> } }
  >
) => {
  const validatedBody = (c.req as any).valid('json') as z.infer<typeof BaseGeminiRequestSchema>;

  if (!validatedBody) {
    return c.json({ error: 'Invalid request body' }, 400);
  }

  const { prompt } = validatedBody;

  const response: z.infer<typeof BaseGeminiResponseSchema> = {
    result: `Placeholder for series titles from prompt: "${prompt}"`,
    status: 'success',
  };
  return c.json(response, 200);
};
