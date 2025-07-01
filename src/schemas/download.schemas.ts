import { z } from 'zod';

export const DownloadXPackagePathParamsSchema = z.object({
  id: z.string().openapi({ param: { name: 'id', in: 'path' }, example: 'some-package-id' }),
});
export type DownloadXPackagePathParams = z.infer<typeof DownloadXPackagePathParamsSchema>;

export const DownloadXPackageResponseSchema = z.object({
  message: z.string(),
});
export type DownloadXPackageResponse = z.infer<typeof DownloadXPackageResponseSchema>;
