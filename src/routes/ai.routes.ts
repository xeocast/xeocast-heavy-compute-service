import { OpenAPIHono } from '@hono/zod-openapi';
import { zValidator } from '@hono/zod-validator';
import { createRoute } from '@hono/zod-openapi';
import {
  TextRequestSchema,
  ErrorSchema,
  TaskCreationResponseSchema,
  // New Schemas
  BaseAIRequestSchema, // For most new routes
  GenerateEpisodeAudioRequestSchema, // Specific for episode audio
  GenerateStructuredScriptRequestSchema,
  GenerateStructuredTitlesRequestSchema,
  GenerateTitlesResponseSchema,
  GenerateStructuredMetadataRequestSchema,
  GenerateStructuredMetadataResponseSchema,
  GenerateImageResponseSchema,
  GenerateMusicResponseSchema,

} from '../schemas/ai.schemas.js';
import { textHandler } from '../handlers/ai/text.handler.js';
// New Handlers
import { titlesHandler } from '../handlers/ai/structured/titles.handler.js';
import { generateStructuredMetadataHandler } from '../handlers/ai/structured/metadata.handler.js';
import { scriptHandler } from '../handlers/ai/structured/script.handler.js';
import { generateEpisodeAudioHandler } from '../handlers/ai/multi-speaker-speech.js';
import { generateThumbnailImageHandler } from '../handlers/ai/image.handler.js';
import { generateArticleImageHandler } from '../handlers/ai/music.handler.js';
import { generateBackgroundMusicHandler } from '../handlers/ai/video.handler.js';
import { bearerAuth } from '../middlewares/auth.js';

// /ai/text
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

// POST /gemini/generate-episode-audio
export const generateEpisodeAudioRoute = createRoute({
  method: 'post',
  path: '/generate-episode-audio',
  request: {
    body: {
      content: {
        'application/json': {
          schema: GenerateEpisodeAudioRequestSchema, // Uses updated schema with optional model
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
      description: 'Audio generation task created and processing started. The actual audio (GenerateEpisodeAudioResponseSchema) will be available via the task status endpoint once completed.',
    },
    400: { description: 'Bad Request', content: { 'application/json': { schema: ErrorSchema } } },
    401: { description: 'Unauthorized', content: { 'application/json': { schema: ErrorSchema } } },
    403: { description: 'Forbidden', content: { 'application/json': { schema: ErrorSchema } } },
    500: { description: 'Internal Server Error', content: { 'application/json': { schema: ErrorSchema } } },
  },
  summary: 'Initiate generation of episode audio from script (asynchronous)',
  tags: ['AI'],
});

// POST /gemini/generate-thumbnail-image
export const generateThumbnailImageRoute = createRoute({
  method: 'post',
  path: '/generate-thumbnail-image',
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
          schema: GenerateImageResponseSchema,
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
export const generateBackgroundMusicRoute = createRoute({
  method: 'post',
  path: '/generate-background-music',
  request: {
    body: {
      content: {
        'application/json': {
          schema: BaseAIRequestSchema, // Prompt for music generation
        },
      },
      description: 'Prompt for generating background music',
    },
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: GenerateMusicResponseSchema,
        },
      },
      description: 'Background music generated successfully',
    },
    400: { description: 'Bad Request', content: { 'application/json': { schema: ErrorSchema } } },
    401: { description: 'Unauthorized', content: { 'application/json': { schema: ErrorSchema } } },
    403: { description: 'Forbidden', content: { 'application/json': { schema: ErrorSchema } } },
    500: { description: 'Internal Server Error', content: { 'application/json': { schema: ErrorSchema } } },
  },
  summary: 'Generate background music',
  tags: ['AI'],
});

// POST /ai/structured/titles
export const GenerateStructuredTitlesRoute = createRoute({
  method: 'post',
  path: '/structured/titles',
  request: {
    body: {
      content: {
        'application/json': {
          schema: GenerateStructuredTitlesRequestSchema,
        },
      },
      description: 'Prompt for generating structured titles',
    },
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: GenerateTitlesResponseSchema,
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
export const generateStructuredMetadataRoute = createRoute({
  method: 'post',
  path: '/structured/metadata',
  request: {
    body: {
      content: {
        'application/json': {
          schema: GenerateStructuredMetadataRequestSchema,
        },
      },
      description: 'Prompt and article for generating structured metadata',
    },
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: GenerateStructuredMetadataResponseSchema,
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
export const generateStructuredScriptRoute = createRoute({
  method: 'post',
  path: '/structured/script',
  request: {
    body: {
      content: {
        'application/json': {
          schema: GenerateStructuredScriptRequestSchema,
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
  { route: GenerateStructuredTitlesRoute, handler: titlesHandler, requestSchema: GenerateStructuredTitlesRequestSchema },
  { route: textRoute, handler: textHandler, requestSchema: TextRequestSchema },
  { route: generateStructuredMetadataRoute, handler: generateStructuredMetadataHandler, requestSchema: GenerateStructuredMetadataRequestSchema },
  { route: generateStructuredScriptRoute, handler: scriptHandler, requestSchema: GenerateStructuredScriptRequestSchema },
  { route: generateEpisodeAudioRoute, handler: generateEpisodeAudioHandler, requestSchema: GenerateEpisodeAudioRequestSchema },
  { route: generateThumbnailImageRoute, handler: generateThumbnailImageHandler, requestSchema: BaseAIRequestSchema },
  { route: generateBackgroundMusicRoute, handler: generateBackgroundMusicHandler, requestSchema: BaseAIRequestSchema },
];

// Apply middlewares in a loop
newRouteConfigs.forEach(({ route, requestSchema }) => {
  aiRoutes.use(route.path, bearerAuth);
  aiRoutes.use(route.path, zValidator('json', requestSchema));
});

// Define OpenAPI routes individually for type safety
aiRoutes.openapi(textRoute, textHandler);
aiRoutes.openapi(generateThumbnailImageRoute, generateThumbnailImageHandler);
aiRoutes.openapi(generateEpisodeAudioRoute, generateEpisodeAudioHandler);
aiRoutes.openapi(generateBackgroundMusicRoute, generateBackgroundMusicHandler);
aiRoutes.openapi(GenerateStructuredTitlesRoute, titlesHandler);
aiRoutes.openapi(generateStructuredMetadataRoute, generateStructuredMetadataHandler);
aiRoutes.openapi(generateStructuredScriptRoute, scriptHandler);

export default aiRoutes;
