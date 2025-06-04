import { OpenAPIHono } from '@hono/zod-openapi';
import { TaskRoute, ListTasksRoute } from '../schemas/taskSchemas';
import { getTaskHandler } from '../handlers/tasks/getTaskHandler';
import { listTasksHandler } from '../handlers/tasks/listTasksHandler';
import { bearerAuth } from '../middlewares/auth'; // Assuming your auth middleware is in 'middlewares/auth.ts'

// Following the pattern from geminiRoutes.ts and memory cbdd0f3c
const taskRoutes = new OpenAPIHono<{ Variables: {} }>();

// GET /tasks - List all tasks
// Apply bearerAuth middleware. No zValidator for request body needed for GET.
taskRoutes.use(ListTasksRoute.path, bearerAuth);
taskRoutes.openapi(ListTasksRoute, listTasksHandler);

// GET /tasks/{taskId} - Get task status
// Apply bearerAuth middleware. Path parameters are validated by the TaskRoute schema.
taskRoutes.use(TaskRoute.path, bearerAuth);
taskRoutes.openapi(TaskRoute, getTaskHandler);

export default taskRoutes;