import type { Context } from 'hono';
import type { RouteConfigToTypedResponse } from '@hono/zod-openapi';
import {
  InferredImageRequest,
} from '../../schemas/ai.schemas.js';
import { createTask, updateTask } from '../../services/task.service.js';
import { generateImageWithGemini } from '../../services/ai/google.service.js';
import { imageRoute } from '../../routes/ai.routes.js';

export const generateImageHandler = async (
  c: Context<
    { Variables: {} },
    typeof imageRoute.path,
    { out: { json: InferredImageRequest } }
  >
): Promise<RouteConfigToTypedResponse<typeof imageRoute>> => {
  const validatedBody = (c.req as any).valid('json') as InferredImageRequest;

  if (!validatedBody) {
    return c.json({ error: 'Invalid request body' }, 400) as any;
  }

  const { prompt, model: requestedModel, provider } = validatedBody;

  const taskId = createTask({ prompt, model: requestedModel, provider });

  c.res = c.json({ taskId: taskId, message: "Image generation task created and processing started." }, 202);

  const processAndCompleteTask = async () => {
    try {
      updateTask(taskId, 'PROCESSING');

      switch (provider) {
        case 'google':
          await generateImageWithGemini(taskId, prompt, requestedModel);
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
