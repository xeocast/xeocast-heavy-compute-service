import { z } from 'zod';
import type { Context } from 'hono';
import {
  generateArticleMetadataRoute,
  BaseGeminiRequestSchema,
  BaseGeminiResponseSchema,
} from '../../schemas/geminiSchemas';

export const generateArticleMetadataHandler = async (
  c: Context<
    { Variables: {} },
    typeof generateArticleMetadataRoute.path,
    { out: { json: z.infer<typeof BaseGeminiRequestSchema> } }
  >
) => {
  const validatedBody = (c.req as any).valid('json') as z.infer<typeof BaseGeminiRequestSchema>;

  if (!validatedBody) {
    return c.json({ error: 'Invalid request body' }, 400);
  }

  const { prompt } = validatedBody;
  console.log(`Received prompt for article metadata: "${prompt}"`);

  const response: z.infer<typeof BaseGeminiResponseSchema> = {
    result: `Placeholder for article metadata from prompt: "${prompt}"`,
    status: 'success',
  };
  return c.json(response, 200);
};
