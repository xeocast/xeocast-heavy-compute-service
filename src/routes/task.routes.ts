import { OpenAPIHono } from '@hono/zod-openapi';
import { createRoute } from '@hono/zod-openapi';
import { z } from 'zod';
import { 
  GetTaskPathParamsSchema,
  GetTaskResponseSchema,
  ListTasksResponseSchema
} from '../schemas/task.schemas.js';
import { getTaskHandler } from '../handlers/tasks/get-task.handler.js';
import { listTasksHandler } from '../handlers/tasks/list-tasks.handler.js';
import { cookieAuth } from '../middlewares/auth.js';

// --- Route Definitions ---

// GET /tasks
export const listTasksRoute = createRoute({
  method: 'get',
  tags: ['Tasks'],
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

// GET /tasks/{taskId}
export const getTaskRoute = createRoute({
  method: 'get',
  tags: ['Tasks'],
  path: '/{taskId}',
  // This is the crucial ID that the `links` object will reference
  operationId: 'getTaskStatus',
  request: {
    params: GetTaskPathParamsSchema,
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: GetTaskResponseSchema, // Use the union schema
        },
      },
      description: 'Retrieve the status and details of a task. The result will vary based on the task status and type.',
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

const taskRoutes = new OpenAPIHono<{ Variables: {} }>();

// GET /tasks - List all tasks
taskRoutes.use(listTasksRoute.path, cookieAuth);
taskRoutes.openapi(listTasksRoute, listTasksHandler);

// GET /tasks/{taskId} - Get task status
taskRoutes.use(getTaskRoute.path, cookieAuth);
taskRoutes.openapi(getTaskRoute, getTaskHandler);

export default taskRoutes;