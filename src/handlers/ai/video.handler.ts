import { z } from 'zod';
import type { Context } from 'hono';
import type { RouteConfigToTypedResponse } from '@hono/zod-openapi';
import {
  VideoRequestSchema,
  type InferredVideoRequest,
} from '../../schemas/ai.schemas.js';
import { createTask, updateTask } from '../../services/task.service.js';
// Import placeholder video generation services
import { generateVideoWithGemini } from '../../services/ai/google.service.js';
import { generateVideoWithGPT } from '../../services/ai/openai.service.js';
import { generateVideoWithGrok } from '../../services/ai/xai.service.js';
import { generateVideoWithClaude } from '../../services/ai/anthropic.service.js';
import { videoRoute } from '../../routes/ai.routes.js';

export const generateVideoHandler = async (
  c: Context<
    { Variables: {} },
    typeof videoRoute.path,
    { out: { json: InferredVideoRequest } }
  >
): Promise<RouteConfigToTypedResponse<typeof videoRoute>> => {
  const validatedBody = (c.req as any).valid('json') as z.infer<typeof VideoRequestSchema>;

  if (!validatedBody) {
    return c.json({ error: 'Invalid request body' }, 400) as any;
  }

  const { prompt, model: requestedModel, provider } = validatedBody;

  const taskId = createTask({ prompt, model: requestedModel, provider });

  c.res = c.json({ taskId: taskId, message: "Video generation task created and processing started." }, 202);

  const processAndCompleteTask = async () => {
    try {
      updateTask(taskId, 'PROCESSING');

      switch (provider) {
        case 'google':
          await generateVideoWithGemini(taskId, prompt, requestedModel);
          break;
        case 'openai':
          await generateVideoWithGPT(taskId, prompt, requestedModel);
          break;
        case 'xai':
          await generateVideoWithGrok(taskId, prompt, requestedModel);
          break;
        case 'anthropic':
          await generateVideoWithClaude(taskId, prompt, requestedModel);
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
  } catch {}

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
