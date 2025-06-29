import { z } from 'zod';
import type { Context } from 'hono';
import {
  generateArticleImageRoute,
  BaseAIRequestSchema,
  GenerateImageResponseSchema,
} from '../../schemas/ai.schemas.js';

export const generateArticleImageHandler = async (
  c: Context<
    { Variables: {} },
    typeof generateArticleImageRoute.path,
    { out: { json: z.infer<typeof BaseAIRequestSchema> } }
  >
) => {
  const validatedBody = (c.req as any).valid('json') as z.infer<typeof BaseAIRequestSchema>;

  if (!validatedBody) {
    return c.json({ error: 'Invalid request body' }, 400);
  }

  // const { prompt } = validatedBody;

  const response: z.infer<typeof GenerateImageResponseSchema> = {
    imageUrl: `https://example.com/placeholder-article-image-for-prompt.png`,
    status: 'success',
  };
  return c.json(response, 200);
};
