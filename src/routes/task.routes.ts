import { OpenAPIHono } from '@hono/zod-openapi';
import { getTaskRoute, listTasksRoute } from '../schemas/task.schemas.js';
import { getTaskHandler } from '../handlers/tasks/get-task.handler.js';
import { listTasksHandler } from '../handlers/tasks/list-tasks.handler.js';
import { bearerAuth } from '../middlewares/auth.js';

const taskRoutes = new OpenAPIHono<{ Variables: {} }>();

// GET /tasks - List all tasks
taskRoutes.use(listTasksRoute.path, bearerAuth);
taskRoutes.openapi(listTasksRoute, listTasksHandler);

// GET /tasks/{taskId} - Get task status
taskRoutes.use(getTaskRoute.path, bearerAuth);
taskRoutes.openapi(getTaskRoute, getTaskHandler);

export default taskRoutes;