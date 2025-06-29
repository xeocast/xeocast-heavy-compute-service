import { OpenAPIHono } from '@hono/zod-openapi';
import { zValidator } from '@hono/zod-validator';
import { createRoute } from '@hono/zod-openapi';
import {
  ErrorSchema,
  TaskCreationResponseSchema,
  BaseAIRequestSchema,
  TextRequestSchema,
  ImageRequestSchema,
  VideoRequestSchema,
  VideoResponseSchema,
  MultiSpeakerSpeechRequestSchema,
  SingleSpeakerSpeechRequestSchema,
  SingleSpeakerSpeechResponseSchema,
  MusicResponseSchema,
  StructuredTitlesRequestSchema,
  StructuredMetadataRequestSchema,
  StructuredScriptRequestSchema,

} from '../schemas/ai.schemas.js';
import { generateTextHandler } from '../handlers/ai/text.handler.js';
import { generateImageHandler } from '../handlers/ai/image.handler.js';
import { generateVideoHandler } from '../handlers/ai/video.handler.js';
import { generateSingleSpeakerSpeechHandler } from '../handlers/ai/single-speaker-speech.handler.js';
import { generateMultiSpeakerSpeechHandler } from '../handlers/ai/multi-speaker-speech.handler.js';
import { generateMusicHandler } from '../handlers/ai/music.handler.js';
import { generateStructuredTitlesHandler } from '../handlers/ai/structured/titles.handler.js';
import { generateStructuredMetadataHandler } from '../handlers/ai/structured/metadata.handler.js';
import { generateStructuredScriptHandler } from '../handlers/ai/structured/script.handler.js';
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

// POST /ai/image
export const imageRoute = createRoute({
  method: 'post',
  path: '/image',
  request: {
    body: {
      content: {
        'application/json': {
          schema: ImageRequestSchema, // Prompt for image generation
        },
      },
      description: 'Prompt for generating an image',
    },
  },
  responses: {
    202: {
      content: {
        'application/json': {
          schema: TaskCreationResponseSchema,
        },
      },
      description: 'Task accepted. Poll the linked endpoint to check for completion. The final result will conform to the `ImageResponse` schema.',
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
  summary: 'Generate an image using a prompt',
  tags: ['AI'],
});

// POST /ai/video
export const videoRoute = createRoute({
  method: 'post',
  path: '/video',
  request: {
    body: {
      content: {
        'application/json': {
          schema: VideoRequestSchema, // Prompt for video generation
        },
      },
      description: 'Prompt for generating video',
    },
  },
  responses: {
    202: {
      content: {
        'application/json': {
          schema: TaskCreationResponseSchema,
        },
      },
      description: 'Task accepted. Poll the linked endpoint to check for completion. The final result will conform to the `VideoResponse` schema.',
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
  summary: 'Generate video',
  tags: ['AI'],
});

// POST /ai/single-speaker-speech
export const singleSpeakerSpeechRoute = createRoute({
  method: 'post',
  path: '/single-speaker-speech',
  request: {
    body: {
      content: {
        'application/json': {
          schema: SingleSpeakerSpeechRequestSchema,
        },
      },
      description: 'Text and optional model for single speaker speech generation',
    },
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: SingleSpeakerSpeechResponseSchema,
        },
      },
      description: 'Single speaker speech generated successfully',
    },
    400: { description: 'Bad Request', content: { 'application/json': { schema: ErrorSchema } } },
    401: { description: 'Unauthorized', content: { 'application/json': { schema: ErrorSchema } } },
    403: { description: 'Forbidden', content: { 'application/json': { schema: ErrorSchema } } },
    500: { description: 'Internal Server Error', content: { 'application/json': { schema: ErrorSchema } } },
  },
  summary: 'Generate single speaker speech',
  tags: ['AI'],
});

// POST /ai/multi-speaker-speech
export const multiSpeakerSpeechRoute = createRoute({
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
    202: {
      content: {
        'application/json': {
          schema: TaskCreationResponseSchema,
        },
      },
      description: 'Structured titles generation task created and processing started. The final result will conform to the `StructuredTitlesResponse` schema.',
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
    202: {
      content: {
        'application/json': {
          schema: TaskCreationResponseSchema,
        },
      },
      description: 'Metadata generation task created and processing started. The final result will conform to the `StructuredMetadataResponse` schema.',
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
  { route: textRoute, handler: generateTextHandler, requestSchema: TextRequestSchema },
  { route: imageRoute, handler: generateImageHandler, requestSchema: BaseAIRequestSchema },
  { route: videoRoute, handler: generateVideoHandler, requestSchema: BaseAIRequestSchema },
  { route: singleSpeakerSpeechRoute, handler: generateSingleSpeakerSpeechHandler, requestSchema: SingleSpeakerSpeechRequestSchema },
  { route: multiSpeakerSpeechRoute, handler: generateMultiSpeakerSpeechHandler, requestSchema: MultiSpeakerSpeechRequestSchema },
  { route: musicRoute, handler: generateMusicHandler, requestSchema: BaseAIRequestSchema },
  { route: structuredTitlesRoute, handler: generateStructuredTitlesHandler, requestSchema: StructuredTitlesRequestSchema },
  { route: structuredMetadataRoute, handler: generateStructuredMetadataHandler, requestSchema: StructuredMetadataRequestSchema },
  { route: structuredScriptRoute, handler: generateStructuredScriptHandler, requestSchema: StructuredScriptRequestSchema },
];

// Apply middlewares in a loop
newRouteConfigs.forEach(({ route, requestSchema }) => {
  aiRoutes.use(route.path, bearerAuth);
  aiRoutes.use(route.path, zValidator('json', requestSchema));
});

// Define OpenAPI routes individually for type safety
aiRoutes.openapi(textRoute, generateTextHandler);
aiRoutes.openapi(imageRoute, generateImageHandler);
aiRoutes.openapi(videoRoute, generateVideoHandler);
aiRoutes.openapi(singleSpeakerSpeechRoute, generateSingleSpeakerSpeechHandler);
aiRoutes.openapi(multiSpeakerSpeechRoute, generateMultiSpeakerSpeechHandler);
aiRoutes.openapi(musicRoute, generateMusicHandler);
aiRoutes.openapi(structuredTitlesRoute, generateStructuredTitlesHandler);
aiRoutes.openapi(structuredMetadataRoute, generateStructuredMetadataHandler);
aiRoutes.openapi(structuredScriptRoute, generateStructuredScriptHandler);

export default aiRoutes;
