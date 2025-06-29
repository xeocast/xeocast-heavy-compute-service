import { z } from 'zod';
import type { Context } from 'hono';
import type { RouteConfigToTypedResponse } from '@hono/zod-openapi';
import {
  MusicRequestSchema,
  type InferredMusicRequest,
} from '../../schemas/ai.schemas.js';
import { createTask, updateTask } from '../../services/task.service.js';
import { musicRoute } from '../../routes/ai.routes.js';
import { generateMusicWithGoogle } from '../../services/ai/google.service.js';
import { generateMusicWithOpenAI } from '../../services/ai/openai.service.js';
import { generateMusicWithXAI } from '../../services/ai/xai.service.js';
import { generateMusicWithAnthropic } from '../../services/ai/anthropic.service.js';

export const generateMusicHandler = async (
  c: Context<
    { Variables: {} },
    typeof musicRoute.path,
    { out: { json: InferredMusicRequest } }
  >
): Promise<RouteConfigToTypedResponse<typeof musicRoute>> => {
  const validatedBody = (c.req as any).valid('json') as z.infer<typeof MusicRequestSchema>;

  if (!validatedBody) {
    return c.json({ error: 'Invalid request body' }, 400) as any;
  }

  const { prompt, model: requestedModel, provider } = validatedBody;

  const taskId = createTask({ prompt, model: requestedModel, provider });

  c.res = c.json({ taskId: taskId, message: "Music generation task created and processing started." }, 202);

  const processAndCompleteTask = async () => {
    try {
      updateTask(taskId, 'PROCESSING');

      switch (provider) {
        case 'google':
          await generateMusicWithGoogle(taskId, prompt, requestedModel);
          break;
        case 'openai':
          await generateMusicWithOpenAI(taskId, prompt, requestedModel);
          break;
        case 'xai':
          await generateMusicWithXAI(taskId, prompt, requestedModel);
          break;
        case 'anthropic':
          await generateMusicWithAnthropic(taskId, prompt, requestedModel);
          break;
        default:
          updateTask(taskId, 'FAILED', { error: { message: `Unsupported AI provider: ${provider}` } });
          break;
      }
    } catch (error: any) {
      console.error(`Task ${taskId}: Unhandled error in background task execution:`, error);
      updateTask(taskId, 'FAILED', {
        error: {
          message: 'Unhandled exception in background processing.',
          details: error.stack || error.toString(),
        },
      });
    }
  };

  let ranWithWaitUntil = false;
  try {
    if (c.executionCtx && typeof c.executionCtx.waitUntil === 'function') {
      c.executionCtx.waitUntil(processAndCompleteTask());
      ranWithWaitUntil = true;
    }
  } catch {
  }

  if (!ranWithWaitUntil) {
    processAndCompleteTask().catch(err => {
      console.error(`Task ${taskId}: Unhandled error in background task execution:`, err);
      updateTask(taskId, 'FAILED', {
        error: {
          message: 'Unhandled exception in background processing.',
          details: err.stack || err.toString(),
        },
      });
    });
  }
  
  return c.res as any;
};
