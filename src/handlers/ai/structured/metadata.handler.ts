import type { Context } from 'hono';
import type { RouteConfigToTypedResponse } from '@hono/zod-openapi';
import {
  InferredStructuredMetadataRequest,
} from '../../../schemas/ai.schemas.js';
import { structuredMetadataRoute } from '../../../routes/ai.routes.js';
import { createTask, updateTask } from '../../../services/task.service.js';
import { generateStructuredMetadataWithGemini } from '../../../services/ai/google/structured-metadata.service.js';

export const generateStructuredMetadataHandler = async (
  c: Context<
    { Variables: {} },
    typeof structuredMetadataRoute.path,
    { out: { json: InferredStructuredMetadataRequest } }
  >
): Promise<RouteConfigToTypedResponse<typeof structuredMetadataRoute>> => {
  const validatedBody = (c.req as any).valid('json') as InferredStructuredMetadataRequest;

  if (!validatedBody) {
    return c.json({ error: 'Invalid request body' }, 400) as any;
  }

  const { prompt, article, model: requestedModel, provider } = validatedBody;

  const taskId = createTask({ prompt, article, model: requestedModel, provider });

  c.res = c.json({ taskId: taskId, message: "Metadata generation task created and processing started." }, 202);

  const processAndCompleteTask = async () => {
    try {
      updateTask(taskId, 'PROCESSING');

      switch (provider) {
        case 'google':
          await generateStructuredMetadataWithGemini(taskId, prompt, article, requestedModel);
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
