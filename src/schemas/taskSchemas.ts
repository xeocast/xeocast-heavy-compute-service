import { z } from 'zod';
import { createRoute } from '@hono/zod-openapi';

export const TaskStatusSchema = z.enum([
  'PENDING',
  'PROCESSING',
  'COMPLETED',
  'FAILED',
]);
export type TaskStatus = z.infer<typeof TaskStatusSchema>;

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

export const GetTaskResponseSchema = TaskSchema;
export type GetTaskResponse = z.infer<typeof GetTaskResponseSchema>;

// Schema for listing all tasks
export const ListTasksResponseSchema = z.array(TaskSchema);
export type ListTasksResponse = z.infer<typeof ListTasksResponseSchema>;

export const ListTasksRoute = createRoute({
  method: 'get',
  path: '/',
  responses: {
    200: {
      content: {
        'application/json': {
          schema: ListTasksResponseSchema,
        },
      },
      description: 'Retrieve a list of all tasks.',
    },
  },
});

export const TaskRoute = createRoute({
  method: 'get',
  path: '/{taskId}',
  request: {
    params: GetTaskPathParamsSchema,
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: GetTaskResponseSchema,
        },
      },
      description: 'Retrieve the status and details of a task.',
    },
    404: {
      content: {
        'application/json': {
          schema: z.object({
            error: z.string(),
          }),
        },
      },
      description: 'Task not found.',
    },
  },
});
