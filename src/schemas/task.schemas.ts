import { z } from 'zod';
import {
  TextResponseSchema,
  ImageResponseSchema,
  VideoResponseSchema,
  SingleSpeakerSpeechResponseSchema,
  MultiSpeakerSpeechResponseSchema,
  MusicResponseSchema,
  StructuredTitlesResponseSchema,
  StructuredScriptResponseSchema,
  StructuredMetadataResponseSchema,
} from './ai.schemas.js';

// --- Base Task Schemas ---

export const TaskStatusSchema = z.enum([
  'PENDING',
  'PROCESSING',
  'COMPLETED',
  'FAILED',
]);
export type TaskStatus = z.infer<typeof TaskStatusSchema>;

// A generic schema for a task that is not yet complete
export const PendingTaskSchema = z
  .object({
    id: z.string().uuid(),
    status: z.enum(['PENDING', 'PROCESSING']),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    input: z.any().optional().openapi({ description: 'The original input that started the task.' }),
  })
  .openapi('PendingTask');

// A generic schema for a failed task
export const FailedTaskSchema = z
  .object({
    id: z.string().uuid(),
    status: z.literal('FAILED'),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    input: z.any().optional().openapi({ description: 'The original input that started the task.' }),
    error: z.object({ message: z.string() }).optional(),
  })
  .openapi('FailedTask');


// --- Completed Task Schemas with Specific Results ---

// A specific schema for a COMPLETED article generation task
export const TextResponseCompletedTaskSchema = z
  .object({
    id: z.string().uuid(),
    status: z.literal('COMPLETED'),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    input: z.any().optional(),
    result: TextResponseSchema, // <-- Embed the specific result schema
  })
  .openapi('TextResponseCompletedTaskSchema');

// A specific schema for a COMPLETED image generation task
export const ImageResponseCompletedTaskSchema = z
  .object({
    id: z.string().uuid(),
    status: z.literal('COMPLETED'),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    input: z.any().optional(),
    result: ImageResponseSchema,
  })
  .openapi('ImageResponseCompletedTaskSchema');

// A specific schema for a COMPLETED video generation task
export const VideoResponseCompletedTaskSchema = z
  .object({
    id: z.string().uuid(),
    status: z.literal('COMPLETED'),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    input: z.any().optional(),
    result: VideoResponseSchema,
  })
  .openapi('VideoResponseCompletedTaskSchema');

// A specific schema for a COMPLETED single-speaker audio generation task
export const SingleSpeakerSpeechResponseCompletedTaskSchema = z
  .object({
    id: z.string().uuid(),
    status: z.literal('COMPLETED'),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    input: z.any().optional(),
    result: SingleSpeakerSpeechResponseSchema,
  })
  .openapi('SingleSpeakerSpeechResponseCompletedTaskSchema');

// A specific schema for a COMPLETED multi-speaker audio generation task
export const MultiSpeakerSpeechResponseCompletedTaskSchema = z
  .object({
    id: z.string().uuid(),
    status: z.literal('COMPLETED'),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    input: z.any().optional(),
    result: MultiSpeakerSpeechResponseSchema,
  })
  .openapi('MultiSpeakerSpeechResponseCompletedTaskSchema');

// A specific schema for a COMPLETED music generation task
export const MusicResponseCompletedTaskSchema = z
  .object({
    id: z.string().uuid(),
    status: z.literal('COMPLETED'),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    input: z.any().optional(),
    result: MusicResponseSchema,
  })
  .openapi('MusicResponseCompletedTaskSchema');

// A specific schema for a COMPLETED titles generation task
export const StructuredTitlesResponseCompletedTaskSchema = z
  .object({
    id: z.string().uuid(),
    status: z.literal('COMPLETED'),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    input: z.any().optional(),
    result: StructuredTitlesResponseSchema,
  })
  .openapi('StructuredTitlesResponseCompletedTaskSchema');

// A specific schema for a COMPLETED metadata generation task
export const StructuredMetadataResponseCompletedTaskSchema = z
  .object({
    id: z.string().uuid(),
    status: z.literal('COMPLETED'),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    input: z.any().optional(),
    result: StructuredMetadataResponseSchema,
  })
  .openapi('StructuredMetadataResponseCompletedTaskSchema');

// A specific schema for a COMPLETED script generation task
export const StructuredScriptResponseCompletedTaskSchema = z
  .object({
    id: z.string().uuid(),
    status: z.literal('COMPLETED'),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    input: z.any().optional(),
    result: StructuredScriptResponseSchema,
  })
  .openapi('StructuredScriptResponseCompletedTaskSchema');

// A union of all possible task states for the polling endpoint.
// z.union() is translated to `oneOf` in the OpenAPI spec.
export const TaskUnionSchema = z.union([
  PendingTaskSchema,
  TextResponseCompletedTaskSchema,
  ImageResponseCompletedTaskSchema,
  VideoResponseCompletedTaskSchema,
  SingleSpeakerSpeechResponseCompletedTaskSchema,
  MultiSpeakerSpeechResponseCompletedTaskSchema,
  MusicResponseCompletedTaskSchema,
  StructuredTitlesResponseCompletedTaskSchema,
  StructuredMetadataResponseCompletedTaskSchema,
  StructuredScriptResponseCompletedTaskSchema,
  FailedTaskSchema,
]).openapi('Task');


// This is the old generic TaskSchema, we keep it for the task service internal type.
export const TaskSchema = z.object({
  id: z.string().uuid(),
  status: TaskStatusSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  input: z.any().optional(),
  result: z.any().optional(),
  error: z.any().optional(),
});
export type Task = z.infer<typeof TaskSchema>;


// --- Route-related Schemas ---

export const CreateTaskResponseSchema = z.object({
  taskId: z.string().uuid(),
});
export type CreateTaskResponse = z.infer<typeof CreateTaskResponseSchema>;

// For GET /tasks/{taskId}
export const GetTaskPathParamsSchema = z.object({
  taskId: z
    .string()
    .uuid()
    .openapi({ param: { name: 'taskId', in: 'path' }, example: '123e4567-e89b-12d3-a456-426614174000' }),
});
export type GetTaskPathParams = z.infer<typeof GetTaskPathParamsSchema>;

export const GetTaskResponseSchema = TaskUnionSchema; // Use the union schema here
export type GetTaskResponse = z.infer<typeof GetTaskResponseSchema>;

// Schema for listing all tasks
export const ListTasksResponseSchema = z.array(TaskSchema); // Listing can remain generic
export type ListTasksResponse = z.infer<typeof ListTasksResponseSchema>;



