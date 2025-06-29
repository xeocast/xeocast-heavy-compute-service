import { z } from 'zod';
import type { Context } from 'hono';
import {
  BaseAIRequestSchema,
  MusicResponseSchema,
} from '../../schemas/ai.schemas.js';
import { musicRoute } from '../../routes/ai.routes.js';

export const musicHandler = async (
  c: Context<
    { Variables: {} },
    typeof musicRoute.path,
    { out: { json: z.infer<typeof BaseAIRequestSchema> } }
  >
) => {
  const validatedBody = (c.req as any).valid('json') as z.infer<typeof BaseAIRequestSchema>;

  if (!validatedBody) {
    return c.json({ error: 'Invalid request body' }, 400);
  }

  // const { prompt } = validatedBody;

  const response: z.infer<typeof MusicResponseSchema> = {
    audioUrl: `https://example.com/placeholder-background-music-for-prompt.mp3`,
    status: 'success',
  };
  return c.json(response, 200);
};
