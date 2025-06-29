import { OpenAPIHono } from '@hono/zod-openapi';
import { zValidator } from '@hono/zod-validator';
import { createRoute } from '@hono/zod-openapi';
import {
  TextRequestSchema,
  ErrorSchema,
  TaskCreationResponseSchema,
  // New Schemas
  BaseAIRequestSchema, // For most new routes
  MultiSpeakerSpeechRequestSchema, // Specific for multi-speaker speech
  StructuredScriptRequestSchema,
  StructuredTitlesRequestSchema,
  StructuredTitlesResponseSchema,
  StructuredMetadataRequestSchema,
  StructuredMetadataResponseSchema,
  ImageResponseSchema,
  MusicResponseSchema,
  VideoResponseSchema,

} from '../schemas/ai.schemas.js';
import { textHandler } from '../handlers/ai/text.handler.js';
// New Handlers
import { titlesHandler } from '../handlers/ai/structured/titles.handler.js';
import { generateStructuredMetadataHandler } from '../handlers/ai/structured/metadata.handler.js';
import { scriptHandler } from '../handlers/ai/structured/script.handler.js';
import { generateMultiSpeakerSpeechHandler } from '../handlers/ai/multi-speaker-speech.js';
import { imageHandler } from '../handlers/ai/image.handler.js';
import { musicHandler } from '../handlers/ai/music.handler.js';
import { videoHandler } from '../handlers/ai/video.handler.js';
import { bearerAuth } from '../middlewares/auth.js';

// POST /ai/text
export const textRoute = createRoute({
  method: 'post',
  path: '/text',
  request: {
    body: {
      content: {
        'application/json': {
          schema: TextRequestSchema,
        },
      },
      description: 'Prompt for content generation',
    },
  },
  responses: {
    202: {
      content: {
        'application/json': {
          schema: TaskCreationResponseSchema,
        },
      },
      description: 'Task accepted. Poll the linked endpoint to check for completion. The final result will conform to the `TextResponse` schema.',
      links: {
        getTaskStatus: {
          operationId: 'getTaskStatus',
          parameters: {
            taskId: '$response.body#/taskId',
          },
          description:
            'A link to poll the status of the created task. The `taskId` from this response body is used as the `taskId` path parameter in the /tasks/{taskId} endpoint.',
        },
      },
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
  summary: 'Generate text using a prompt',
  tags: ['AI'],
});

// POST /ai/multi-speaker-speech
export const generateMultiSpeakerSpeechRoute = createRoute({
  method: 'post',
  path: '/multi-speaker-speech',
  request: {
    body: {
      content: {
        'application/json': {
          schema: MultiSpeakerSpeechRequestSchema, // Uses updated schema with optional model
        },
      },
      description: 'Script and optional model for audio generation',
    },
  },
  responses: {
    202: { // Changed from 200 to 202 for async task creation
      content: {
        'application/json': {
          schema: TaskCreationResponseSchema, // Response is now taskId and message
        },
      },
      description: 'Multi-speaker speech generation task created and processing started. The actual audio (GenerateMultiSpeakerSpeechResponseSchema) will be available via the task status endpoint once completed.',
    },
    400: { description: 'Bad Request', content: { 'application/json': { schema: ErrorSchema } } },
    401: { description: 'Unauthorized', content: { 'application/json': { schema: ErrorSchema } } },
    403: { description: 'Forbidden', content: { 'application/json': { schema: ErrorSchema } } },
    500: { description: 'Internal Server Error', content: { 'application/json': { schema: ErrorSchema } } },
  },
  summary: 'Initiate generation of multi-speaker speech from script (asynchronous)',
  tags: ['AI'],
});

// POST /ai/image
export const imageRoute = createRoute({
  method: 'post',
  path: '/image',
  request: {
    body: {
      content: {
        'application/json': {
          schema: BaseAIRequestSchema, // Prompt for image generation
        },
      },
      description: 'Prompt for generating a thumbnail image',
    },
  },
  responses: {
    200: {
      content: {
        'application/json': { 
          schema: ImageResponseSchema,
        },
      },
      description: 'Thumbnail image generated successfully',
    },
    400: { description: 'Bad Request', content: { 'application/json': { schema: ErrorSchema } } },
    401: { description: 'Unauthorized', content: { 'application/json': { schema: ErrorSchema } } },
    403: { description: 'Forbidden', content: { 'application/json': { schema: ErrorSchema } } },
    500: { description: 'Internal Server Error', content: { 'application/json': { schema: ErrorSchema } } },
  },
  summary: 'Generate a thumbnail image',
  tags: ['AI'],
});

// POST /gemini/generate-background-music
export const musicRoute = createRoute({
  method: 'post',
  path: '/music',
  request: {
    body: {
      content: {
        'application/json': {
          schema: BaseAIRequestSchema, // Prompt for music generation
        },
      },
      description: 'Prompt for generating music',
    },
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: MusicResponseSchema,
        },
      },
      description: 'Music generated successfully',
    },
    400: { description: 'Bad Request', content: { 'application/json': { schema: ErrorSchema } } },
    401: { description: 'Unauthorized', content: { 'application/json': { schema: ErrorSchema } } },
    403: { description: 'Forbidden', content: { 'application/json': { schema: ErrorSchema } } },
    500: { description: 'Internal Server Error', content: { 'application/json': { schema: ErrorSchema } } },
  },
  summary: 'Generate music',
  tags: ['AI'],
});

export const videoRoute = createRoute({
  method: 'post',
  path: '/video',
  request: {
    body: {
      content: {
        'application/json': {
          schema: BaseAIRequestSchema, // Prompt for video generation
        },
      },
      description: 'Prompt for generating video',
    },
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: VideoResponseSchema,
        },
      },
      description: 'Video generated successfully',
    },
    400: { description: 'Bad Request', content: { 'application/json': { schema: ErrorSchema } } },
    401: { description: 'Unauthorized', content: { 'application/json': { schema: ErrorSchema } } },
    403: { description: 'Forbidden', content: { 'application/json': { schema: ErrorSchema } } },
    500: { description: 'Internal Server Error', content: { 'application/json': { schema: ErrorSchema } } },
  },
  summary: 'Generate video',
  tags: ['AI'],
});

// POST /ai/structured/titles
export const structuredTitlesRoute = createRoute({
  method: 'post',
  path: '/structured/titles',
  request: {
    body: {
      content: {
        'application/json': {
          schema: StructuredTitlesRequestSchema,
        },
      },
      description: 'Prompt for generating structured titles',
    },
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: StructuredTitlesResponseSchema,
        },
      },
      description: 'Structured titles generated successfully',
    },
    400: { description: 'Bad Request', content: { 'application/json': { schema: ErrorSchema } } },
    401: { description: 'Unauthorized', content: { 'application/json': { schema: ErrorSchema } } },
    403: { description: 'Forbidden', content: { 'application/json': { schema: ErrorSchema } } },
    500: { description: 'Internal Server Error', content: { 'application/json': { schema: ErrorSchema } } },
  },
  summary: 'Generate structured titles',
  tags: ['AI'],
});

// POST /ai/structured/metadata
export const structuredMetadataRoute = createRoute({
  method: 'post',
  path: '/structured/metadata',
  request: {
    body: {
      content: {
        'application/json': {
          schema: StructuredMetadataRequestSchema,
        },
      },
      description: 'Prompt and article for generating structured metadata',
    },
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: StructuredMetadataResponseSchema,
        },
      },
      description: 'Structured metadata generated successfully',
    },
    400: { description: 'Bad Request', content: { 'application/json': { schema: ErrorSchema } } },
    401: { description: 'Unauthorized', content: { 'application/json': { schema: ErrorSchema } } },
    403: { description: 'Forbidden', content: { 'application/json': { schema: ErrorSchema } } },
    500: { description: 'Internal Server Error', content: { 'application/json': { schema: ErrorSchema } } },
  },
  summary: 'Generate structured metadata',
  tags: ['AI'],
});

// POST /ai/structured/script
export const structuredScriptRoute = createRoute({
  method: 'post',
  path: '/structured/script',
  request: {
    body: {
      content: {
        'application/json': {
          schema: StructuredScriptRequestSchema,
        },
      },
      description: 'Prompt for generating a episode script',
    },
  },
  responses: {
    202: {
      content: {
        'application/json': {
          schema: TaskCreationResponseSchema, // Use the existing schema for task creation responses
        },
      },
      description: 'Task created successfully and episode script generation is being processed',
    },
    400: { description: 'Bad Request', content: { 'application/json': { schema: ErrorSchema } } },
    401: { description: 'Unauthorized', content: { 'application/json': { schema: ErrorSchema } } },
    403: { description: 'Forbidden', content: { 'application/json': { schema: ErrorSchema } } },
    500: { description: 'Internal Server Error', content: { 'application/json': { schema: ErrorSchema } } },
  },
  summary: 'Generate a structured script',
  tags: ['AI'],
});

export const aiRoutes = new OpenAPIHono<{ Variables: {} }>();

// --- Register New Gemini Endpoints ---

// Helper array for applying middlewares
const newRouteConfigs = [
  { route: structuredTitlesRoute, handler: titlesHandler, requestSchema: StructuredTitlesRequestSchema },
  { route: textRoute, handler: textHandler, requestSchema: TextRequestSchema },
  { route: structuredMetadataRoute, handler: generateStructuredMetadataHandler, requestSchema: StructuredMetadataRequestSchema },
  { route: structuredScriptRoute, handler: scriptHandler, requestSchema: StructuredScriptRequestSchema },
  { route: generateMultiSpeakerSpeechRoute, handler: generateMultiSpeakerSpeechHandler, requestSchema: MultiSpeakerSpeechRequestSchema },
  { route: imageRoute, handler: imageHandler, requestSchema: BaseAIRequestSchema },
  { route: musicRoute, handler: musicHandler, requestSchema: BaseAIRequestSchema },
  { route: videoRoute, handler: videoHandler, requestSchema: BaseAIRequestSchema },
];

// Apply middlewares in a loop
newRouteConfigs.forEach(({ route, requestSchema }) => {
  aiRoutes.use(route.path, bearerAuth);
  aiRoutes.use(route.path, zValidator('json', requestSchema));
});

// Define OpenAPI routes individually for type safety
aiRoutes.openapi(textRoute, textHandler);
aiRoutes.openapi(imageRoute, imageHandler);
aiRoutes.openapi(videoRoute, videoHandler);
aiRoutes.openapi(generateMultiSpeakerSpeechRoute, generateMultiSpeakerSpeechHandler);
aiRoutes.openapi(musicRoute, musicHandler);
aiRoutes.openapi(structuredTitlesRoute, titlesHandler);
aiRoutes.openapi(structuredMetadataRoute, generateStructuredMetadataHandler);
aiRoutes.openapi(structuredScriptRoute, scriptHandler);

export default aiRoutes;
