import { z } from 'zod';
import type { Context } from 'hono';
import {
  BaseAIRequestSchema,
  VideoResponseSchema,
} from '../../schemas/ai.schemas.js';
import { videoRoute } from '../../routes/ai.routes.js';

export const videoHandler = async (
  c: Context<
    { Variables: {} },
    typeof videoRoute.path,
    { out: { json: z.infer<typeof BaseAIRequestSchema> } }
  >
) => {
  const validatedBody = (c.req as any).valid('json') as z.infer<typeof BaseAIRequestSchema>;

  if (!validatedBody) {
    return c.json({ error: 'Invalid request body' }, 400);
  }

  // const { prompt } = validatedBody;

  const response: z.infer<typeof VideoResponseSchema> = {
    videoUrl: `https://example.com/placeholder-video-for-prompt.mp4`,
    status: 'success',
  };
  return c.json(response, 200);
};
