import { z } from 'zod';
import {
  TextResponseSchema,
  GenerateTitlesResponseSchema,
  GenerateStructuredScriptResponseSchema,
  GenerateEpisodeAudioResponseSchema,
  GenerateImageResponseSchema,
  GenerateMusicResponseSchema,
  BaseAIResponseSchema,
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
export const CompletedGenerateArticleTaskSchema = z
  .object({
    id: z.string().uuid(),
    status: z.literal('COMPLETED'),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    input: z.any().optional(),
    result: TextResponseSchema, // <-- Embed the specific result schema
  })
  .openapi('CompletedGenerateArticleTask');

// A specific schema for a COMPLETED titles generation task
export const CompletedGenerateTitlesTaskSchema = z
  .object({
    id: z.string().uuid(),
    status: z.literal('COMPLETED'),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    input: z.any().optional(),
    result: GenerateTitlesResponseSchema,
  })
  .openapi('CompletedGenerateTitlesTask');

// A specific schema for a COMPLETED script generation task
export const CompletedGenerateScriptTaskSchema = z
  .object({
    id: z.string().uuid(),
    status: z.literal('COMPLETED'),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    input: z.any().optional(),
    result: GenerateStructuredScriptResponseSchema,
  })
  .openapi('CompletedGenerateScriptTask');

// A specific schema for a COMPLETED audio generation task
export const CompletedGenerateAudioTaskSchema = z
  .object({
    id: z.string().uuid(),
    status: z.literal('COMPLETED'),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    input: z.any().optional(),
    result: GenerateEpisodeAudioResponseSchema,
  })
  .openapi('CompletedGenerateAudioTask');

// A specific schema for a COMPLETED image generation task
export const CompletedGenerateImageTaskSchema = z
  .object({
    id: z.string().uuid(),
    status: z.literal('COMPLETED'),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    input: z.any().optional(),
    result: GenerateImageResponseSchema,
  })
  .openapi('CompletedGenerateImageTask');

// A specific schema for a COMPLETED music generation task
export const CompletedGenerateMusicTaskSchema = z
  .object({
    id: z.string().uuid(),
    status: z.literal('COMPLETED'),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    input: z.any().optional(),
    result: GenerateMusicResponseSchema,
  })
  .openapi('CompletedGenerateMusicTask');

// A specific schema for other completed Gemini tasks
export const CompletedBaseGeminiTaskSchema = z
  .object({
    id: z.string().uuid(),
    status: z.literal('COMPLETED'),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    input: z.any().optional(),
    result: BaseAIResponseSchema,
  })
  .openapi('CompletedBaseGeminiTask');


// A union of all possible task states for the polling endpoint.
// z.union() is translated to `oneOf` in the OpenAPI spec.
export const TaskUnionSchema = z.union([
  PendingTaskSchema,
  FailedTaskSchema,
  CompletedGenerateArticleTaskSchema,
  CompletedGenerateTitlesTaskSchema,
  CompletedGenerateScriptTaskSchema,
  CompletedGenerateAudioTaskSchema,
  CompletedGenerateImageTaskSchema,
  CompletedGenerateMusicTaskSchema,
  CompletedBaseGeminiTaskSchema,
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

export const GetTaskResponseSchema = TaskUnionSchema; // Use the union schema here
export type GetTaskResponse = z.infer<typeof GetTaskResponseSchema>;

// Schema for listing all tasks
export const ListTasksResponseSchema = z.array(TaskSchema); // Listing can remain generic
export type ListTasksResponse = z.infer<typeof ListTasksResponseSchema>;



