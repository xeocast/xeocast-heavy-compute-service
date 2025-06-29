import type { Context } from 'hono'; // Use base Hono Context
import type { RouteConfigToTypedResponse } from '@hono/zod-openapi';
import {
  type InferredStructuredScriptRequest,
} from '../../../schemas/ai.schemas.js';
import { structuredScriptRoute } from '../../../routes/ai.routes.js';
import { createTask, updateTask } from '../../../services/task.service.js';
import { generateStructuredScriptWithGemini } from '../../../services/ai/google/structured-script.service.js';

export const generateStructuredScriptHandler = async (
  c: Context<
    { Variables: {} }, // Environment type
    typeof structuredScriptRoute.path, // Path from route definition
    { out: { json: InferredStructuredScriptRequest } } // Input type for validation
  >
): Promise<RouteConfigToTypedResponse<typeof structuredScriptRoute>> => {
  const validatedBody = (c.req as any).valid('json') as InferredStructuredScriptRequest;

  if (!validatedBody) {
    return c.json({ error: 'Invalid request body' }, 400) as any;
  }

  const { prompt, article, model: requestedModel, provider } = validatedBody;

  const taskId = createTask({ prompt, article, model: requestedModel, provider });

  c.res = c.json({ taskId: taskId, message: "Episode script generation task created and processing started." }, 202);

  const processAndCompleteTask = async () => {
    try {
      updateTask(taskId, 'PROCESSING');

      switch (provider) {
        case 'google':
          await generateStructuredScriptWithGemini(taskId, prompt, article, requestedModel);
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
