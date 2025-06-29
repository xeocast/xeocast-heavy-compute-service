import { z } from 'zod';
import type { Context } from 'hono'; // Use base Hono Context
import type { RouteConfigToTypedResponse } from '@hono/zod-openapi';
import { StructuredScriptRequestSchema } from '../../../schemas/ai.schemas.js';
import { structuredScriptRoute } from '../../../routes/ai.routes.js';
import { GoogleGenAI, Type } from '@google/genai';
import { createTask, updateTask } from '../../../services/task.service.js';

// Define the type for the input based on the Zod schema
type InferredGenerateStructuredScriptRequest = z.infer<typeof StructuredScriptRequestSchema>;

export const generateStructuredScriptHandler = async (
  c: Context<
    { Variables: {} }, // Environment type
    typeof structuredScriptRoute.path, // Path from route definition
    { out: { json: InferredGenerateStructuredScriptRequest } } // Input type for validation
  >
): Promise<RouteConfigToTypedResponse<typeof structuredScriptRoute>> => {
  const validatedBody = (c.req as any).valid('json') as InferredGenerateStructuredScriptRequest;

  if (!validatedBody) {
    return c.json({ error: 'Invalid request body' }, 400) as any;
  }

  const { prompt, article, model: requestedModel } = validatedBody;

  // 1. Create a task with relevant input from the request
  const taskId = createTask({ prompt, article, model: requestedModel });

  // 2. Immediately set the response to be sent to the client.
  c.res = c.json({ taskId: taskId, message: "Episode script generation task created and processing started." }, 202);

  // 3. Define and execute the Gemini processing and task update logic asynchronously.
  const processAndCompleteTask = async () => {
    try {
      updateTask(taskId, 'PROCESSING');

      if (!process.env.GEMINI_API_KEY) {
        console.error(`Task ${taskId}: GEMINI_API_KEY is not configured.`);
        updateTask(taskId, 'FAILED', { error: { message: 'GEMINI_API_KEY is not configured' } });
        return;
      }

      const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const aiModelName = requestedModel || "gemini-2.5-flash-preview-05-20";

      const fullPromptText = (str: string) =>
        str.replace(/\{ ?articleContent ?\}/g, article);

      const aiResponse = await genAI.models.generateContent({
        model: aiModelName,
        contents: [
          { role: "user", parts: [{ text: fullPromptText(prompt) }] }
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                speaker: {
                  type: Type.STRING,
                },
                line: {
                  type: Type.STRING,
                }
              },
              required: ['speaker', 'line'],
              propertyOrdering: ['speaker', 'line'],
            },
          },
        },
      });

      const metaJsonString = aiResponse.text;

      if (metaJsonString == null) { 
        console.error(`Task ${taskId}: Failed to generate content from Gemini. JSON string is null or undefined.`);
        updateTask(taskId, 'FAILED', { error: { message: 'Failed to generate content - JSON string is null or undefined' } });
        return;
      }

      let parsedResult;
      try {
        parsedResult = JSON.parse(metaJsonString);
      } catch (e: any) {
        console.error(`Task ${taskId}: Generated script is not valid JSON: ${metaJsonString}`, e);
        updateTask(taskId, 'FAILED', { error: { message: 'Generated script is not valid JSON', details: e.message } });
        return;
      }

      const resultPayload = {
        result: parsedResult,
        status: 'success', // This status refers to the Gemini operation outcome
      };
      updateTask(taskId, 'COMPLETED', { result: resultPayload });

    } catch (error: any) {
      console.error(`Task ${taskId}: Error during episode script generation: ${error.message}`, error);
      updateTask(taskId, 'FAILED', {
        error: {
          message: error.message || 'Unknown error during episode script generation',
          details: error.stack || error.toString(),
        },
      });
    }
  };

  // Execute the task processing in the background.
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
  
  return c.res as any; // Explicitly return the response
};
