import { Context } from 'hono';
import type { RouteConfigToTypedResponse } from '@hono/zod-openapi';
import { getTaskById } from '../../services/task.service.js';
import {
  GetTaskPathParams,
  GetTaskResponse,
} from '../../schemas/task.schemas.js';
import { getTaskRoute } from '../../routes/task.routes.js';

export const getTaskHandler = async (
  c: Context<
    { Variables: {} },
    typeof getTaskRoute.path,
    { out: { param: GetTaskPathParams } }
  >
): Promise<RouteConfigToTypedResponse<typeof getTaskRoute>> => {
  const { taskId } = c.req.valid('param');

  const task = getTaskById(taskId);

  if (!task) {
    // The 404 response schema is defined in `getTaskRoute`
    return c.json({ error: 'Task not found' }, 404);
  }

  // The `task` object from the service is generic. The route schema expects a
  // discriminated union based on the task's status and result type.
  // We cast to `any` here as a pragmatic step to satisfy TypeScript.
  // This allows the OpenAPI docs to correctly show the linked schemas and all
  // possible result structures, even though the runtime object from our simple
  // task service is a more generic shape.
  return c.json(task as GetTaskResponse, 200);
};
