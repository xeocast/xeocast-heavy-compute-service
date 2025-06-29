import { z } from 'zod';

export const TextRequestSchema = z.object({
  prompt: z.string().min(1, { message: 'Prompt cannot be empty' }),
  model: z.string().optional(),
}).openapi('TextRequest');

export type InferredTextRequest = z.infer<typeof TextRequestSchema>;

export const TextResponseSchema = z.object({
  generatedText: z.string(),
  status: z.string(),
}).openapi('TextResponse');

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

export const BaseAIResponseSchema = z.object({
  result: z.string(), // Generic result field
  status: z.string(),
}).openapi('BaseAIResponse');

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

// POST /ai/structured/titles
export const GenerateStructuredTitlesRequestSchema = z.object({
  prompt: z.string().openapi({ example: 'How to learn to code' }),
  model: z.string().openapi({ example: 'gemini-1.5-pro-latest' }),
}).openapi('GenerateStructuredTitlesRequest');

// --- Specific Schemas for GenerateArticleMetadata ---
export const GenerateStructuredMetadataRequestSchema = z.object({
  prompt: z.string().min(1, { message: 'Prompt cannot be empty' }),
  article: z.string().min(1, { message: 'Article content cannot be empty' }),
  model: z.string().optional(),
}).openapi('GenerateStructuredMetadataRequest');

export const GenerateStructuredMetadataResponseSchema = z.object({
  result: z.object({
    description: z.string(),
    tags: z.array(z.string()),
    thumbnailPrompt: z.string(),
    articleImagePrompt: z.string(),
  }),
  status: z.string(),
}).openapi('GenerateStructuredMetadataResponse');
