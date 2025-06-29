import { z } from 'zod';
import type { Context } from 'hono';
import {
  BaseAIRequestSchema,
  GenerateMusicResponseSchema,
} from '../../schemas/ai.schemas.js';
import { generateBackgroundMusicRoute } from '../../routes/ai.routes.js';

export const generateBackgroundMusicHandler = async (
  c: Context<
    { Variables: {} },
    typeof generateBackgroundMusicRoute.path,
    { out: { json: z.infer<typeof BaseAIRequestSchema> } }
  >
) => {
  const validatedBody = (c.req as any).valid('json') as z.infer<typeof BaseAIRequestSchema>;

  if (!validatedBody) {
    return c.json({ error: 'Invalid request body' }, 400);
  }

  // const { prompt } = validatedBody;

  const response: z.infer<typeof GenerateMusicResponseSchema> = {
    audioUrl: `https://example.com/placeholder-background-music-for-prompt.mp3`,
    status: 'success',
  };
  return c.json(response, 200);
};
