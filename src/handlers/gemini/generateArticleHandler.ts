import { z } from 'zod';
import type { Context } from 'hono'; // Use base Hono Context due to @hono/zod-openapi type resolution issues
import type { RouteConfigToTypedResponse } from '@hono/zod-openapi';
import {
  generateArticleRoute, // Import the route definition
  GenerateArticleRequestSchema, // Keep for z.infer on response or if needed elsewhere
  type InferredGenerateArticleRequest, // Import the new type alias
  // GenerateArticleResponseSchema, // No longer directly returned by handler's immediate response, but its structure is used for task result
} from '../../schemas/geminiSchemas.js';
import { GoogleGenAI } from '@google/genai'; // Reverted to GoogleGenAI
import { createTask, updateTask } from '../../services/taskService.js';

// This is a skeleton handler. Implement the actual Gemini API call here.
export const generateArticleHandler = async (
  c: Context<
    { Variables: {} }, // Environment type, can be more specific if needed
    typeof generateArticleRoute.path, // Path from your route definition
    { out: { json: InferredGenerateArticleRequest } } // Use the explicit type alias for input
  >
): Promise<RouteConfigToTypedResponse<typeof generateArticleRoute>> => {
  const validatedBody = (c.req as any).valid('json') as z.infer<typeof GenerateArticleRequestSchema>;

  if (!validatedBody) {
    // This should ideally be caught by zValidator, but as a fallback:
    return c.json({ error: 'Invalid request body' }, 400) as any;
  }

  const { prompt, model: requestedModel } = validatedBody;

  // 1. Create a task with relevant input from the request
  const taskId = createTask({ prompt, model: requestedModel });

  // 2. Immediately set the response to be sent to the client.
  // Hono will send this response. 202 Accepted is appropriate for long-running tasks.
  c.res = c.json({ taskId: taskId, message: "Article generation task created and processing started." }, 202);

  // 3. Define and execute the Gemini processing and task update logic asynchronously.
  const processAndCompleteTask = async () => {
    try {
      updateTask(taskId, 'PROCESSING');

      if (!process.env.GEMINI_API_KEY) {
        console.error(`Task ${taskId}: GEMINI_API_KEY is not configured.`);
        updateTask(taskId, 'FAILED', { error: { message: 'GEMINI_API_KEY is not configured' } });
        return;
      }

      const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }); // Reverted
      const aiModelName = requestedModel || "gemini-2.5-flash-preview-05-20";

      const aiResponse = await genAI.models.generateContent({ // Reverted
        model: aiModelName,
        contents: [{ role: "user", parts: [{ text: prompt }] }],
      });

      const generatedText = aiResponse.text; // Reverted to direct property access

      // Check if generatedText is null, undefined, or an empty string (if empty string is considered a failure)
      // Assuming null/undefined means failure, empty string might be a valid (empty) generation.
      if (generatedText == null) { 
        console.error(`Task ${taskId}: Failed to generate content from Gemini. Text is null or undefined.`);
        updateTask(taskId, 'FAILED', { error: { message: 'Failed to generate content - text is null or undefined' } });
        return;
      }

      const resultPayload = {
        generatedText: generatedText,
        status: 'success', // This status refers to the Gemini operation outcome
      };
      updateTask(taskId, 'COMPLETED', { result: resultPayload });

    } catch (error: any) {
      console.error(`Task ${taskId}: Error during article generation: ${error.message}`, error);
      updateTask(taskId, 'FAILED', {
        error: {
          message: error.message || 'Unknown error during article generation',
          details: error.stack || error.toString(), // Include stack for better debugging
        },
      });
    }
  };

  // Execute the task processing in the background.
  // Execute the task processing in the background.
  // Use c.executionCtx.waitUntil in environments that support it (e.g., Cloudflare Workers).
  // Otherwise, run the task asynchronously for other environments (like local Node.js).
  let ranWithWaitUntil = false;
  try {
    // The c.executionCtx getter might throw if not in a compatible environment.
    if (c.executionCtx && typeof c.executionCtx.waitUntil === 'function') {
      c.executionCtx.waitUntil(processAndCompleteTask());
      ranWithWaitUntil = true;
    }
  } catch (e) {
    // This catch block is expected in environments like Node.js where c.executionCtx is not available.
    // console.info('c.executionCtx.waitUntil is not available or access failed. Proceeding with standard async execution.'); // Optional: for debugging
  }

  if (!ranWithWaitUntil) {
    // For environments without waitUntil (like local Node.js), or if an error occurred trying to use it.
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
  
  return c.res as any; // Explicitly return the response, cast for stricter typing
};
