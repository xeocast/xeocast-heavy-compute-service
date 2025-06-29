import { z } from 'zod';
import type { Context } from 'hono';
import type { RouteConfigToTypedResponse } from '@hono/zod-openapi';
import {
  SingleSpeakerSpeechRequestSchema,
} from '../../schemas/ai.schemas.js';
import { singleSpeakerSpeechRoute } from '../../routes/ai.routes.js';
import { createTask, updateTask } from '../../services/task.service.js';
import { generateSingleSpeakerAudioWithGemini } from '../../services/ai/google/single-speaker-speech.service.js';

export const generateSingleSpeakerSpeechHandler = async (
  c: Context<
    { Variables: {} },
    typeof singleSpeakerSpeechRoute.path,
    { out: { json: z.infer<typeof SingleSpeakerSpeechRequestSchema> } }
  >
): Promise<RouteConfigToTypedResponse<typeof singleSpeakerSpeechRoute>> => {
  const validatedBody = (c.req as any).valid('json') as z.infer<typeof SingleSpeakerSpeechRequestSchema>;

  if (!validatedBody) {
    return c.json({ error: 'Invalid request body' }, 400) as any;
  }

  const { text, model, output_bucket_key, provider } = validatedBody;

  const taskId = createTask({ text, model, output_bucket_key, type: 'singleSpeakerAudioGeneration' });

  c.res = c.json({ taskId: taskId, message: "Single speaker audio generation task created and processing started." }, 202);

  const processAndCompleteTask = async () => {
    try {
      updateTask(taskId, 'PROCESSING');

      let generatedAudioResult;
      switch (provider) {
        case 'google':
          generatedAudioResult = await generateSingleSpeakerAudioWithGemini(text, model, output_bucket_key, taskId);
          break;
        // Add cases for other providers here when their service functions are implemented
        default:
          updateTask(taskId, 'FAILED', { error: { message: `Unsupported AI provider: ${provider}` } });
          break;
      }
      updateTask(taskId, 'COMPLETED', { result: generatedAudioResult });

    } catch (error: any) {
      console.error(`Task ${taskId}: Error during single speaker audio generation: ${error.message}`, error);
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
