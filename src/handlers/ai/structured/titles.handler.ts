import { z } from 'zod';
import type { Context } from 'hono';
import type { RouteConfigToTypedResponse } from '@hono/zod-openapi';
import {
  StructuredTitlesRequestSchema,
} from '../../../schemas/ai.schemas.js';
import { structuredTitlesRoute } from '../../../routes/ai.routes.js';
import { createTask, updateTask } from '../../../services/task.service.js';
import { generateStructuredTitlesWithGemini } from '../../../services/ai/google.service.js';

// Extend the request schema to include a provider
type InferredStructuredTitlesRequest = z.infer<typeof StructuredTitlesRequestSchema> & {
  provider: 'google' | 'anthropic' | 'openai' | 'xai'; // Add other providers as they are implemented
};

export const generateStructuredTitlesHandler = async (
  c: Context<
    { Variables: {} },
    typeof structuredTitlesRoute.path,
    { out: { json: InferredStructuredTitlesRequest } }
  >
): Promise<RouteConfigToTypedResponse<typeof structuredTitlesRoute>> => {
  const validatedBody = (c.req as any).valid('json') as InferredStructuredTitlesRequest;

  if (!validatedBody) {
    return c.json({ error: 'Invalid request body' }, 400) as any;
  }

  const { prompt, model: requestedModel, provider } = validatedBody;

  const taskId = createTask({ prompt, model: requestedModel, provider });

  c.res = c.json({ taskId: taskId, message: "Structured titles generation task created and processing started." }, 202);

  const processAndCompleteTask = async () => {
    try {
      updateTask(taskId, 'PROCESSING');

      switch (provider) {
        case 'google':
          await generateStructuredTitlesWithGemini(taskId, prompt, requestedModel);
          break;
        // Add cases for other providers here when their service functions are implemented
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
    // Fallback if waitUntil is not available
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
