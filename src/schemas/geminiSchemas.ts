import { z } from 'zod';
import { createRoute } from '@hono/zod-openapi';

export const GenerateContentRequestSchema = z.object({
  prompt: z.string().min(1, { message: 'Prompt cannot be empty' }),
}).openapi('GenerateContentRequest');

export const GenerateContentResponseSchema = z.object({
  generatedText: z.string(),
  status: z.string(),
}).openapi('GenerateContentResponse');

export const ErrorSchema = z.object({
  error: z.string(),
}).openapi('Error');

export const generateContentRoute = createRoute({
  method: 'post',
  path: '/gemini/generate-content',
  request: {
    body: {
      content: {
        'application/json': {
          schema: GenerateContentRequestSchema,
        },
      },
      description: 'Prompt for content generation',
    },
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: GenerateContentResponseSchema,
        },
      },
      description: 'Content generated successfully',
    },
    400: {
      description: 'Bad Request: Invalid input',
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
    },
    401: {
      description: 'Unauthorized: Missing or invalid token format',
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
    },
    403: {
      description: 'Forbidden: Invalid token',
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
    },
    500: {
      description: 'Internal Server Error',
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
    },
  },
  summary: 'Generate content using a prompt',
  tags: ['Gemini'],
});
