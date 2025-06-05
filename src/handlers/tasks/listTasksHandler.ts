import { Context } from 'hono';
import { getAllTasks } from '../../services/taskService.js';

export const listTasksHandler = async (c: Context<{ Variables: {} }>) => {
  const tasks = getAllTasks();
  return c.json(tasks, 200);
};