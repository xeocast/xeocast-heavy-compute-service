import { OpenAPIHono, createRoute } from '@hono/zod-openapi';
import { 
  DownloadXPackagePathParamsSchema,
  DownloadYouTubePackagePathParamsSchema
} from '../schemas/download.schemas.js';
import { downloadXPackageHandler, CloudflareEnv } from '../handlers/downloads/download-x-package.handler.js';
import { downloadYouTubePackageHandler } from '../handlers/downloads/download-youtube-package.js';
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
        'application/zip': {
          schema: { type: 'string', format: 'binary' },
        },
      },
      description: 'Initiates download for a specified package.',
    },
  },
});

const downloadRoutes = new OpenAPIHono<{ Bindings: CloudflareEnv }>();

downloadRoutes.use(downloadXPackageRoute.path, cookieAuth);
downloadRoutes.openapi(downloadXPackageRoute, downloadXPackageHandler);

// GET /downloads/youtube-package/{id}
export const downloadYouTubePackageRoute = createRoute({
  method: 'get',
  tags: ['Downloads'],
  path: '/youtube-package/{id}',
  operationId: 'downloadYouTubePackage',
  request: {
    params: DownloadYouTubePackagePathParamsSchema,
  },
  responses: {
    200: {
      content: {
        'application/zip': {
          schema: { type: 'string', format: 'binary' },
        },
      },
      description: 'Initiates download for a specified YouTube package.',
    },
  },
});

downloadRoutes.use(downloadYouTubePackageRoute.path, cookieAuth);
downloadRoutes.openapi(downloadYouTubePackageRoute, downloadYouTubePackageHandler);


export default downloadRoutes;
