import { Context } from 'hono';
import type { RouteConfigToTypedResponse } from '@hono/zod-openapi';
import { DownloadXPackageResponse } from '../../schemas/download.schemas.js';
import { downloadXPackageRoute } from '../../routes/download.routes.js';

interface Env {
  Variables: {};
}

export const downloadXPackageHandler = async (
  c: Context<Env>
): Promise<RouteConfigToTypedResponse<typeof downloadXPackageRoute>> => {
  const id = c.req.param('id');
  console.log(`Received request for x-package with ID: ${id}`);
  return c.json<DownloadXPackageResponse>({ message: `Download for package ${id} initiated.` }, 200) as RouteConfigToTypedResponse<typeof downloadXPackageRoute>;
};
