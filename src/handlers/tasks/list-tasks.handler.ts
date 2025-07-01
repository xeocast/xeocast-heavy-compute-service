import { Context } from 'hono';
import { getAllTasks } from '../../services/task.service.js';
import { ListTasksResponse } from '../../schemas/task.schemas.js';

export const listTasksHandler = async (c: Context<{ Variables: {} }>) => {
  const tasks = getAllTasks();
  return c.json(tasks as ListTasksResponse, 200);
};