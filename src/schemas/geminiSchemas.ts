import { z } from 'zod';
import { createRoute } from '@hono/zod-openapi';

export const GenerateArticleRequestSchema = z.object({
  prompt: z.string().min(1, { message: 'Prompt cannot be empty' }),
  model: z.string().optional(),
}).openapi('GenerateArticleRequest');

export type InferredGenerateArticleRequest = z.infer<typeof GenerateArticleRequestSchema>;

export const GenerateArticleResponseSchema = z.object({
  generatedText: z.string(),
  status: z.string(),
}).openapi('GenerateArticleResponse');

export const ErrorSchema = z.object({
  error: z.string(),
}).openapi('Error');

export const TaskCreationResponseSchema = z.object({
  taskId: z.string().uuid(),
  message: z.string(),
}).openapi('TaskCreationResponse');

// /gemini/generate-article
export const generateArticleRoute = createRoute({
  method: 'post',
  path: '/generate-article',
  request: {
    body: {
      content: {
        'application/json': {
          schema: GenerateArticleRequestSchema,
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
      description: 'Task accepted. Poll the linked endpoint to check for completion. The final result will conform to the `GenerateArticleResponse` schema.',
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
  summary: 'Generate an article using a prompt',
  tags: ['Gemini'],
});

// --- Base Schemas for new Gemini Endpoints ---
export const BaseGeminiRequestSchema = z.object({
  prompt: z.string().min(1, { message: 'Prompt cannot be empty' }),
  model: z.string().optional(),
}).openapi('BaseGeminiRequest');

export const BaseGeminiResponseSchema = z.object({
  result: z.string(), // Generic result field
  status: z.string(),
}).openapi('BaseGeminiResponse');

// Specific Schemas for certain Gemini Endpoints
export const GenerateEpisodeAudioRequestSchema = z.object({ 
  script: z.string().min(1, { message: 'Script cannot be empty' }),
  model: z.string().optional(), // Added optional model
  output_bucket_key: z.string().optional().describe('The R2 bucket key where the generated audio should be stored.'),
}).openapi('GenerateEpisodeAudioRequest');

export type InferredGenerateEpisodeAudioRequest = z.infer<typeof GenerateEpisodeAudioRequestSchema>;

export const GenerateEpisodeAudioResponseSchema = z.object({
  bucketKey: z.string().describe('The R2 bucket key where the audio file is stored.'),
  mimeType: z.string().describe('The MIME type of the generated audio file.'),
  status: z.string(),
}).openapi('GenerateEpisodeAudioResponse');

export const GenerateImageResponseSchema = z.object({
  imageUrl: z.string().url({ message: 'Invalid URL format for imageUrl' }),
  status: z.string(),
}).openapi('GenerateImageResponse');

export const GenerateMusicResponseSchema = z.object({
  audioUrl: z.string().url({ message: 'Invalid URL format for audioUrl' }), 
  status: z.string(),
}).openapi('GenerateMusicResponse');

// --- Specific Schemas for GenerateEpisodeScript ---
export const GenerateEpisodeScriptRequestSchema = z.object({
  prompt: z.string().min(1, { message: 'Prompt cannot be empty' }),
  article: z.string().min(1, { message: 'Article content cannot be empty' }),
  model: z.string().optional(),
}).openapi('GenerateEpisodeScriptRequest');

export const GenerateEpisodeScriptResponseSchema = z.object({
  result: z.array(
    z.object({
      speaker: z.string(),
      line: z.string(),
    }).required({ speaker: true, line: true })
  ),
  status: z.string(),
}).openapi('GenerateEpisodeScriptResponse');

// Specific Schemas for Titles
export const GenerateTitlesResponseSchema = z.object({
  result: z.array(
    z.object({
      title: z.string(),
      description: z.string(),
    })
  ),
  status: z.string(),
}).openapi('GenerateTitlesResponse');


// --- Route Definitions for New Gemini Endpoints ---

// POST /gemini/generate-evergreen-titles
export const generateEvergreenTitlesRoute = createRoute({
  method: 'post',
  path: '/generate-evergreen-titles',
  request: {
    body: {
      content: {
        'application/json': {
          schema: BaseGeminiRequestSchema,
        },
      },
      description: 'Prompt for generating evergreen titles',
    },
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: GenerateTitlesResponseSchema,
        },
      },
      description: 'Evergreen titles generated successfully',
    },
    400: { description: 'Bad Request', content: { 'application/json': { schema: ErrorSchema } } },
    401: { description: 'Unauthorized', content: { 'application/json': { schema: ErrorSchema } } },
    403: { description: 'Forbidden', content: { 'application/json': { schema: ErrorSchema } } },
    500: { description: 'Internal Server Error', content: { 'application/json': { schema: ErrorSchema } } },
  },
  summary: 'Generate evergreen titles',
  tags: ['Gemini'],
});

// POST /gemini/generate-news-titles
export const generateNewsTitlesRoute = createRoute({
  method: 'post',
  path: '/generate-news-titles',
  request: {
    body: {
      content: {
        'application/json': {
          schema: BaseGeminiRequestSchema,
        },
      },
      description: 'Prompt for generating news titles',
    },
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: GenerateTitlesResponseSchema,
        },
      },
      description: 'News titles generated successfully',
    },
    400: { description: 'Bad Request', content: { 'application/json': { schema: ErrorSchema } } },
    401: { description: 'Unauthorized', content: { 'application/json': { schema: ErrorSchema } } },
    403: { description: 'Forbidden', content: { 'application/json': { schema: ErrorSchema } } },
    500: { description: 'Internal Server Error', content: { 'application/json': { schema: ErrorSchema } } },
  },
  summary: 'Generate news titles',
  tags: ['Gemini'],
});

// --- Specific Schemas for GenerateArticleMetadata ---
export const GenerateArticleMetadataRequestSchema = z.object({
  prompt: z.string().min(1, { message: 'Prompt cannot be empty' }),
  article: z.string().min(1, { message: 'Article content cannot be empty' }),
  model: z.string().optional(),
}).openapi('GenerateArticleMetadataRequest');

export const GenerateArticleMetadataResponseSchema = z.object({
  result: z.object({
    description: z.string(),
    tags: z.array(z.string()),
    thumbnailPrompt: z.string(),
    articleImagePrompt: z.string(),
  }),
  status: z.string(),
}).openapi('GenerateArticleMetadataResponse');

// POST /gemini/generate-series-titles
export const generateSeriesTitlesRoute = createRoute({
  method: 'post',
  path: '/generate-series-titles',
  request: {
    body: {
      content: {
        'application/json': {
          schema: BaseGeminiRequestSchema,
        },
      },
      description: 'Prompt for generating series titles',
    },
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: BaseGeminiResponseSchema,
        },
      },
      description: 'Series titles generated successfully',
    },
    400: { description: 'Bad Request', content: { 'application/json': { schema: ErrorSchema } } },
    401: { description: 'Unauthorized', content: { 'application/json': { schema: ErrorSchema } } },
    403: { description: 'Forbidden', content: { 'application/json': { schema: ErrorSchema } } },
    500: { description: 'Internal Server Error', content: { 'application/json': { schema: ErrorSchema } } },
  },
  summary: 'Generate series titles',
  tags: ['Gemini'],
});

// POST /gemini/generate-article-metadata
export const generateArticleMetadataRoute = createRoute({
  method: 'post',
  path: '/generate-article-metadata',
  request: {
    body: {
      content: {
        'application/json': {
          schema: GenerateArticleMetadataRequestSchema,
        },
      },
      description: 'Prompt and article for generating article metadata',
    },
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: GenerateArticleMetadataResponseSchema,
        },
      },
      description: 'Article metadata generated successfully',
    },
    400: { description: 'Bad Request', content: { 'application/json': { schema: ErrorSchema } } },
    401: { description: 'Unauthorized', content: { 'application/json': { schema: ErrorSchema } } },
    403: { description: 'Forbidden', content: { 'application/json': { schema: ErrorSchema } } },
    500: { description: 'Internal Server Error', content: { 'application/json': { schema: ErrorSchema } } },
  },
  summary: 'Generate article metadata',
  tags: ['Gemini'],
});

// POST /gemini/generate-episode-script
export const generateEpisodeScriptRoute = createRoute({
  method: 'post',
  path: '/generate-episode-script',
  request: {
    body: {
      content: {
        'application/json': {
          schema: GenerateEpisodeScriptRequestSchema,
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
  summary: 'Generate a episode script',
  tags: ['Gemini'],
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
  tags: ['Gemini'],
});

// POST /gemini/generate-thumbnail-image
export const generateThumbnailImageRoute = createRoute({
  method: 'post',
  path: '/generate-thumbnail-image',
  request: {
    body: {
      content: {
        'application/json': {
          schema: BaseGeminiRequestSchema, // Prompt for image generation
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
  tags: ['Gemini'],
});

// POST /gemini/generate-article-image
export const generateArticleImageRoute = createRoute({
  method: 'post',
  path: '/generate-article-image',
  request: {
    body: {
      content: {
        'application/json': {
          schema: BaseGeminiRequestSchema, // Prompt for image generation
        },
      },
      description: 'Prompt for generating an article image',
    },
  },
  responses: {
    200: {
      content: {
        'application/json': { 
          schema: GenerateImageResponseSchema,
        },
      },
      description: 'Article image generated successfully',
    },
    400: { description: 'Bad Request', content: { 'application/json': { schema: ErrorSchema } } },
    401: { description: 'Unauthorized', content: { 'application/json': { schema: ErrorSchema } } },
    403: { description: 'Forbidden', content: { 'application/json': { schema: ErrorSchema } } },
    500: { description: 'Internal Server Error', content: { 'application/json': { schema: ErrorSchema } } },
  },
  summary: 'Generate an article image',
  tags: ['Gemini'],
});

// POST /gemini/generate-intro-music
export const generateIntroMusicRoute = createRoute({
  method: 'post',
  path: '/generate-intro-music',
  request: {
    body: {
      content: {
        'application/json': {
          schema: BaseGeminiRequestSchema, // Prompt for music generation (e.g., mood, genre, length)
        },
      },
      description: 'Prompt for generating intro music',
    },
  },
  responses: {
    200: {
      content: {
        'application/json': { 
          schema: GenerateMusicResponseSchema,
        },
      },
      description: 'Intro music generated successfully',
    },
    400: { description: 'Bad Request', content: { 'application/json': { schema: ErrorSchema } } },
    401: { description: 'Unauthorized', content: { 'application/json': { schema: ErrorSchema } } },
    403: { description: 'Forbidden', content: { 'application/json': { schema: ErrorSchema } } },
    500: { description: 'Internal Server Error', content: { 'application/json': { schema: ErrorSchema } } },
  },
  summary: 'Generate intro music',
  tags: ['Gemini'],
});

// POST /gemini/generate-background-music
export const generateBackgroundMusicRoute = createRoute({
  method: 'post',
  path: '/generate-background-music',
  request: {
    body: {
      content: {
        'application/json': {
          schema: BaseGeminiRequestSchema, // Prompt for music generation
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
  tags: ['Gemini'],
});

