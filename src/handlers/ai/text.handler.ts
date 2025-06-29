import { z } from 'zod';
import type { Context } from 'hono'; // Use base Hono Context due to @hono/zod-openapi type resolution issues
import type { RouteConfigToTypedResponse } from '@hono/zod-openapi';
import {
  TextRequestSchema,
  type InferredTextRequest,
} from '../../schemas/ai.schemas.js';
import { createTask, updateTask } from '../../services/task.service.js';
import { generateTextWithGemini } from '../../services/ai/google.service.js';
import { generateTextWithGPT } from '../../services/ai/openai.service.js';
import { generateTextWithGrok } from '../../services/ai/xai.service.js';
import { generateTextWithClaude } from '../../services/ai/anthropic.service.js';
import { textRoute } from '../../routes/ai.routes.js';

export const generateTextHandler = async (
  c: Context<
    { Variables: {} }, // Environment type, can be more specific if needed
    typeof textRoute.path, // Path from your route definition
    { out: { json: InferredTextRequest } } // Use the explicit type alias for input
  >
): Promise<RouteConfigToTypedResponse<typeof textRoute>> => {
  const validatedBody = (c.req as any).valid('json') as z.infer<typeof TextRequestSchema>;

  if (!validatedBody) {
    return c.json({ error: 'Invalid request body' }, 400) as any;
  }

  const { prompt, model: requestedModel, provider } = validatedBody;

  const taskId = createTask({ prompt, model: requestedModel, provider });

  c.res = c.json({ taskId: taskId, message: "Text generation task created and processing started." }, 202);

  const processAndCompleteTask = async () => {
    try {
      updateTask(taskId, 'PROCESSING');

      switch (provider) {
        case 'google':
          await generateTextWithGemini(taskId, prompt, requestedModel);
          break;
        case 'openai':
          await generateTextWithGPT(taskId, prompt, requestedModel);
          break;
        case 'xai':
          await generateTextWithGrok(taskId, prompt, requestedModel);
          break;
        case 'anthropic':
          await generateTextWithClaude(taskId, prompt, requestedModel);
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
