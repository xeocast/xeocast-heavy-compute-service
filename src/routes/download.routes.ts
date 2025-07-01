import { OpenAPIHono } from '@hono/zod-openapi';
import { createRoute } from '@hono/zod-openapi';
import { 
  DownloadXPackagePathParamsSchema,
  DownloadXPackageResponseSchema
} from '../schemas/download.schemas.js';
import { downloadXPackageHandler, CloudflareEnv } from '../handlers/downloads/download-x-package.handler.js';
import { cookieAuth } from '../middlewares/auth.js';

// GET /downloads/x-package/{id}
export const downloadXPackageRoute = createRoute({
  method: 'get',
  tags: ['Downloads'],
  path: '/x-package/{id}',
  operationId: 'downloadXPackage',
  request: {
    params: DownloadXPackagePathParamsSchema,
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: DownloadXPackageResponseSchema,
        },
      },
      description: 'Initiates download for a specified package.',
    },
  },
});

const downloadRoutes = new OpenAPIHono<{ Bindings: CloudflareEnv }>();

downloadRoutes.use(downloadXPackageRoute.path, cookieAuth);
downloadRoutes.openapi(downloadXPackageRoute, downloadXPackageHandler);


export default downloadRoutes;
