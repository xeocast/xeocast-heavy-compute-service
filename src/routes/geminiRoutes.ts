import { OpenAPIHono } from '@hono/zod-openapi';
import { zValidator } from '@hono/zod-validator';
import {
  generateContentRoute,
  GenerateContentRequestSchema,
} from '../schemas/geminiSchemas';
import { generateContentHandler } from '../handlers/geminiHandler';
import { bearerAuth } from '../middlewares/auth';

const geminiRoutes = new OpenAPIHono();

// Apply middleware specifically to the paths that need them.
// Order matters: auth first, then validation.
geminiRoutes.use(generateContentRoute.path, bearerAuth);
geminiRoutes.use(
  generateContentRoute.path,
  zValidator('json', GenerateContentRequestSchema)
);

// Define the OpenAPI route
geminiRoutes.openapi(generateContentRoute, generateContentHandler);

export default geminiRoutes;
