import { z } from 'zod';

export const ErrorSchema = z.object({
  error: z.string(),
}).openapi('Error');

export const TaskCreationResponseSchema = z.object({
  taskId: z.string().uuid(),
  message: z.string(),
}).openapi('TaskCreationResponse');

export const BaseAIRequestSchema = z.object({
  prompt: z.string().min(1, { message: 'Prompt cannot be empty' }),
  model: z.string().optional(),
}).openapi('BaseAIRequest');

export const BaseAIResponseSchema = z.object({
  result: z.string(), // Generic result field
  status: z.string(),
}).openapi('BaseAIResponse');

// -- Text Generation --

export const TextRequestSchema = z.object({
  prompt: z.string().min(1, { message: 'Prompt cannot be empty' }),
  model: z.string().optional(),
  provider: z.enum(['google', 'xai', 'openai', 'anthropic']).optional().default('google'),
}).openapi('TextRequest');
export type TextRequest = z.infer<typeof TextRequestSchema>;

export const TextResponseSchema = z.object({
  text: z.string(),
  status: z.string(),
}).openapi('TextResponse');
export type TextResponse = z.infer<typeof TextResponseSchema>;

// -- Image Generation --

export const ImageRequestSchema = BaseAIRequestSchema.extend({
  provider: z.enum(['google', 'xai', 'openai', 'anthropic']).optional().default('google'),
}).openapi('ImageRequest');
export type ImageRequest = z.infer<typeof ImageRequestSchema>;

export const ImageResponseSchema = z.object({
  imageUrl: z.string().url({ message: 'Invalid URL format for imageUrl' }),
  status: z.string(),
}).openapi('ImageResponse');
export type ImageResponse = z.infer<typeof ImageResponseSchema>;

// -- Video Generation --

export const VideoRequestSchema = z.object({
  prompt: z.string().min(1, { message: 'Prompt cannot be empty' }),
  model: z.string().optional(),
  provider: z.enum(['google', 'xai', 'openai', 'anthropic']).optional().default('google'),
}).openapi('VideoRequest');
export type VideoRequest = z.infer<typeof VideoRequestSchema>;

export const VideoResponseSchema = z.object({
  videoUrl: z.string().url({ message: 'Invalid URL format for videoUrl' }), 
  status: z.string(),
}).openapi('VideoResponse');
export type VideoResponse = z.infer<typeof VideoResponseSchema>;

// -- Single Speaker Speech Generation --

export const SingleSpeakerSpeechRequestSchema = z.object({
  text: z.string().min(1, { message: 'Text cannot be empty' }),
  model: z.string().optional(),
  provider: z.enum(['google', 'xai', 'openai', 'anthropic']).optional().default('google'),
  output_bucket_key: z.string().optional().describe('The R2 bucket key where the generated audio should be stored.'),
}).openapi('SingleSpeakerSpeechRequest');
export type SingleSpeakerSpeechRequest = z.infer<typeof SingleSpeakerSpeechRequestSchema>;

export const SingleSpeakerSpeechResponseSchema = z.object({
  bucketKey: z.string().describe('The R2 bucket key where the audio file is stored.'),
  mimeType: z.string().describe('The MIME type of the generated audio file.'),
  status: z.string(),
}).openapi('SingleSpeakerSpeechResponse');
export type SingleSpeakerSpeechResponse = z.infer<typeof SingleSpeakerSpeechResponseSchema>;

// -- Multi Speaker Speech Generation --

export const MultiSpeakerSpeechRequestSchema = z.object({
  script: z.string().min(1, { message: 'Script cannot be empty' }),
  model: z.string().optional(), // Added optional model
  provider: z.enum(['google', 'xai', 'openai', 'anthropic']).optional().default('google'),
  output_bucket_key: z.string().optional().describe('The R2 bucket key where the generated audio should be stored.'),
}).openapi('MultiSpeakerSpeechRequest');
export type MultiSpeakerSpeechRequest = z.infer<typeof MultiSpeakerSpeechRequestSchema>;

export const MultiSpeakerSpeechResponseSchema = z.object({
  bucketKey: z.string().describe('The R2 bucket key where the audio file is stored.'),
  mimeType: z.string().describe('The MIME type of the generated audio file.'),
  status: z.string(),
}).openapi('MultiSpeakerSpeechResponse');
export type MultiSpeakerSpeechResponse = z.infer<typeof MultiSpeakerSpeechResponseSchema>;

// -- Music Generation --

export const MusicRequestSchema = BaseAIRequestSchema.extend({
  provider: z.enum(['google', 'xai', 'openai', 'anthropic']).optional().default('google'),
}).openapi('MusicRequest');
export type MusicRequest = z.infer<typeof MusicRequestSchema>;

export const MusicResponseSchema = z.object({
  audioUrl: z.string().url({ message: 'Invalid URL format for audioUrl' }), 
  status: z.string(),
}).openapi('MusicResponse');
export type MusicResponse = z.infer<typeof MusicResponseSchema>;

// -- Structured Titles Generation --

export const StructuredTitlesRequestSchema = z.object({
  prompt: z.string().openapi({ example: 'How to learn to code' }),
  model: z.string().openapi({ example: 'gemini-2.5-flash' }),
  provider: z.enum(['google', 'xai', 'openai', 'anthropic']).optional().default('google'),
}).openapi('StructuredTitlesRequest');
export type StructuredTitlesRequest = z.infer<typeof StructuredTitlesRequestSchema>;

export const StructuredTitlesResponseSchema = z.object({
  titles: z.array(
    z.object({
      title: z.string(),
      description: z.string(),
    })
  ),
  status: z.string(),
}).openapi('StructuredTitlesResponse');
export type StructuredTitlesResponse = z.infer<typeof StructuredTitlesResponseSchema>;

// -- Structured Metadata Generation --

export const StructuredMetadataRequestSchema = z.object({
  prompt: z.string().min(1, { message: 'Prompt cannot be empty' }),
  article: z.string().min(1, { message: 'Article content cannot be empty' }),
  model: z.string().optional(),
  provider: z.enum(['google', 'xai', 'openai', 'anthropic']).optional().default('google'),
}).openapi('StructuredMetadataRequest');
export type StructuredMetadataRequest = z.infer<typeof StructuredMetadataRequestSchema>;

export const StructuredMetadataResponseSchema = z.object({
  metadata: z.object({
    description: z.string(),
    tags: z.array(z.string()),
    thumbnailPrompt: z.string(),
    articleImagePrompt: z.string(),
  }),
  status: z.string(),
}).openapi('StructuredMetadataResponse');
export type StructuredMetadataResponse = z.infer<typeof StructuredMetadataResponseSchema>;

// -- Structured Script Generation --

export const StructuredScriptRequestSchema = z.object({
  prompt: z.string().min(1, { message: 'Prompt cannot be empty' }),
  article: z.string().min(1, { message: 'Article content cannot be empty' }),
  model: z.string().optional(),
  provider: z.enum(['google', 'xai', 'openai', 'anthropic']).optional().default('google'),
}).openapi('StructuredScriptRequest');
export type StructuredScriptRequest = z.infer<typeof StructuredScriptRequestSchema>;

export const StructuredScriptResponseSchema = z.object({
  result: z.array(
    z.object({
      speaker: z.string(),
      line: z.string(),
    }).required({ speaker: true, line: true })
  ),
  status: z.string(),
}).openapi('StructuredScriptResponse');
export type StructuredScriptResponse = z.infer<typeof StructuredScriptResponseSchema>;
