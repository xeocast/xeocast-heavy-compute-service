import { z } from 'zod';
import type { Context } from 'hono';
import type { RouteConfigToTypedResponse } from '@hono/zod-openapi';
import {
  MultiSpeakerSpeechRequestSchema,
  type InferredMultiSpeakerSpeechRequest,
  // GenerateMultiSpeakerSpeechResponseSchema is used for the task's result structure
} from '../../schemas/ai.schemas.js';
import { createTask, updateTask } from '../../services/task.service.js';
import { generateMultiSpeakerAudioWithGemini } from '../../services/ai/google/multi-speaker-speech.service.js';
import { multiSpeakerSpeechRoute } from '../../routes/ai.routes.js';

export const generateMultiSpeakerSpeechHandler = async (
  c: Context<
    { Variables: {} },
    typeof multiSpeakerSpeechRoute.path,
    { out: { json: InferredMultiSpeakerSpeechRequest } }
  >
): Promise<RouteConfigToTypedResponse<typeof multiSpeakerSpeechRoute>> => {
  const validatedBody = (c.req as any).valid('json') as z.infer<typeof MultiSpeakerSpeechRequestSchema>;

  if (!validatedBody) {
    return c.json({ error: 'Invalid request body' }, 400) as any;
  }

  const { script, model: requestedModel, output_bucket_key, provider } = validatedBody;

  const taskId = createTask({ script, model: requestedModel, type: 'audioGeneration' });

  c.res = c.json({ taskId: taskId, message: "Audio generation task created and processing started." }, 202);

  const processAndCompleteTask = async () => {
    try {
      updateTask(taskId, 'PROCESSING');

      let resultPayload;
      switch (provider) {
        case 'google':
          resultPayload = await generateMultiSpeakerAudioWithGemini(script, requestedModel, output_bucket_key, taskId);
          break;
        // Add cases for other providers here when their service functions are implemented
        default:
          updateTask(taskId, 'FAILED', { error: { message: `Unsupported AI provider: ${provider}` } });
          break;
      }

      updateTask(taskId, 'COMPLETED', { result: resultPayload });

    } catch (error: any) {
      console.error(`Task ${taskId}: Error during audio generation: ${error.message}`, error);
      updateTask(taskId, 'FAILED', {
        error: {
          message: error.message || 'Unknown error during audio generation',
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
    // console.info('c.executionCtx.waitUntil is not available. Proceeding with standard async execution.');
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
