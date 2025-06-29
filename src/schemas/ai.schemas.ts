import { z } from 'zod';

export const TextRequestSchema = z.object({
  prompt: z.string().min(1, { message: 'Prompt cannot be empty' }),
  model: z.string().optional(),
  provider: z.enum(['google', 'xai', 'openai', 'anthropic']).optional().default('google'),
}).openapi('TextRequest');

export type InferredTextRequest = z.infer<typeof TextRequestSchema>;

export const TextResponseSchema = z.object({
  generatedText: z.string(),
  status: z.string(),
}).openapi('TextResponse');

export const VideoRequestSchema = z.object({
  prompt: z.string().min(1, { message: 'Prompt cannot be empty' }),
  model: z.string().optional(),
  provider: z.enum(['google', 'xai', 'openai', 'anthropic']).optional().default('google'),
}).openapi('VideoRequest');

export type InferredVideoRequest = z.infer<typeof VideoRequestSchema>;

export const ErrorSchema = z.object({
  error: z.string(),
}).openapi('Error');

export const TaskCreationResponseSchema = z.object({
  taskId: z.string().uuid(),
  message: z.string(),
}).openapi('TaskCreationResponse');

// --- Base Schemas for new AI Endpoints ---
export const BaseAIRequestSchema = z.object({
  prompt: z.string().min(1, { message: 'Prompt cannot be empty' }),
  model: z.string().optional(),
}).openapi('BaseAIRequest');

export const ImageRequestSchema = BaseAIRequestSchema.extend({
  provider: z.enum(['google', 'xai', 'openai', 'anthropic']).optional().default('google'),
}).openapi('ImageRequest');

export const MusicRequestSchema = BaseAIRequestSchema.extend({
  provider: z.enum(['google', 'xai', 'openai', 'anthropic']).optional().default('google'),
}).openapi('MusicRequest');

export type InferredMusicRequest = z.infer<typeof MusicRequestSchema>;

export type InferredImageRequest = z.infer<typeof ImageRequestSchema>;

export const BaseAIResponseSchema = z.object({
  result: z.string(), // Generic result field
  status: z.string(),
}).openapi('BaseAIResponse');

// Specific Schemas for certain Gemini Endpoints
export const MultiSpeakerSpeechRequestSchema = z.object({
  script: z.string().min(1, { message: 'Script cannot be empty' }),
  model: z.string().optional(), // Added optional model
  provider: z.enum(['google', 'xai', 'openai', 'anthropic']).optional().default('google'),
  output_bucket_key: z.string().optional().describe('The R2 bucket key where the generated audio should be stored.'),
}).openapi('MultiSpeakerSpeechRequest');

export type InferredMultiSpeakerSpeechRequest = z.infer<typeof MultiSpeakerSpeechRequestSchema>;

export const MultiSpeakerSpeechResponseSchema = z.object({
  bucketKey: z.string().describe('The R2 bucket key where the audio file is stored.'),
  mimeType: z.string().describe('The MIME type of the generated audio file.'),
  status: z.string(),
}).openapi('MultiSpeakerSpeechResponse');

export const ImageResponseSchema = z.object({
  imageUrl: z.string().url({ message: 'Invalid URL format for imageUrl' }),
  status: z.string(),
}).openapi('ImageResponse');

export const MusicResponseSchema = z.object({
  audioUrl: z.string().url({ message: 'Invalid URL format for audioUrl' }), 
  status: z.string(),
}).openapi('MusicResponse');

export const VideoResponseSchema = z.object({
  videoUrl: z.string().url({ message: 'Invalid URL format for videoUrl' }), 
  status: z.string(),
}).openapi('VideoResponse');

// --- Specific Schemas for StructuredScript ---
export const StructuredScriptRequestSchema = z.object({
  prompt: z.string().min(1, { message: 'Prompt cannot be empty' }),
  article: z.string().min(1, { message: 'Article content cannot be empty' }),
  model: z.string().optional(),
  provider: z.enum(['google', 'xai', 'openai', 'anthropic']).optional().default('google'),
}).openapi('StructuredScriptRequest');

export type InferredStructuredScriptRequest = z.infer<typeof StructuredScriptRequestSchema>;

export const StructuredScriptResponseSchema = z.object({
  result: z.array(
    z.object({
      speaker: z.string(),
      line: z.string(),
    }).required({ speaker: true, line: true })
  ),
  status: z.string(),
}).openapi('StructuredScriptResponse');

// Specific Schemas for StructuredTitles
export const StructuredTitlesResponseSchema = z.object({
  result: z.array(
    z.object({
      title: z.string(),
      description: z.string(),
    })
  ),
  status: z.string(),
}).openapi('StructuredTitlesResponse');

// POST /ai/structured/titles
export const StructuredTitlesRequestSchema = z.object({
  prompt: z.string().openapi({ example: 'How to learn to code' }),
  model: z.string().openapi({ example: 'gemini-2.5-flash' }),
  provider: z.enum(['google', 'xai', 'openai', 'anthropic']).optional().default('google'),
}).openapi('StructuredTitlesRequest');

// --- Specific Schemas for StructuredMetadata ---
export const StructuredMetadataRequestSchema = z.object({
  prompt: z.string().min(1, { message: 'Prompt cannot be empty' }),
  article: z.string().min(1, { message: 'Article content cannot be empty' }),
  model: z.string().optional(),
  provider: z.enum(['google', 'xai', 'openai', 'anthropic']).optional().default('google'),
}).openapi('StructuredMetadataRequest');

export type InferredStructuredMetadataRequest = z.infer<typeof StructuredMetadataRequestSchema>;

export const StructuredMetadataResponseSchema = z.object({
  result: z.object({
    description: z.string(),
    tags: z.array(z.string()),
    thumbnailPrompt: z.string(),
    articleImagePrompt: z.string(),
  }),
  status: z.string(),
}).openapi('StructuredMetadataResponse');

export const SingleSpeakerSpeechRequestSchema = z.object({
  text: z.string().min(1, { message: 'Text cannot be empty' }),
  model: z.string().optional(),
  provider: z.enum(['google', 'xai', 'openai', 'anthropic']).optional().default('google'),
  output_bucket_key: z.string().optional().describe('The R2 bucket key where the generated audio should be stored.'),
}).openapi('SingleSpeakerSpeechRequest');

export type InferredSingleSpeakerSpeechRequest = z.infer<typeof SingleSpeakerSpeechRequestSchema>;

export const SingleSpeakerSpeechResponseSchema = z.object({
  bucketKey: z.string().describe('The R2 bucket key where the audio file is stored.'),
  mimeType: z.string().describe('The MIME type of the generated audio file.'),
  status: z.string(),
}).openapi('SingleSpeakerSpeechResponse');
