import { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { getTaskById } from '../../services/taskService.js';
import { GetTaskPathParamsSchema } from '../../schemas/taskSchemas.js'; // For param validation

export const getTaskHandler = async (c: Context<{ Variables: {} }>) => {
  const paramData = { taskId: c.req.param('taskId') };
  const parsedParams = GetTaskPathParamsSchema.safeParse(paramData);

  if (!parsedParams.success) {
    throw new HTTPException(400, { message: 'Invalid taskId format' });
  }
  const taskId = parsedParams.data.taskId;

  const task = getTaskById(taskId);

  if (!task) {
    // TaskRoute schema expects { error: string } for 404
    return c.json({ error: 'Task not found' }, 404);
  }

  return c.json(task, 200);
};
