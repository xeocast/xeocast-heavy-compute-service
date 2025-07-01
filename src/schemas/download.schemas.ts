import { z } from 'zod';

// -- X Package Download --

export const DownloadXPackagePathParamsSchema = z.object({
  id: z.string().openapi({ param: { name: 'id', in: 'path' }, example: 'some-episode-id' }),
});
export type DownloadXPackagePathParams = z.infer<typeof DownloadXPackagePathParamsSchema>;

// -- YouTube Package Download --

export const DownloadYouTubePackagePathParamsSchema = z.object({
  id: z.string().openapi({ param: { name: 'id', in: 'path' }, example: 'some-episode-id' }),
});
export type DownloadYouTubePackagePathParams = z.infer<typeof DownloadYouTubePackagePathParamsSchema>;

// -- Related Schemas --

export const YouTubeChannelSchema = z.object({
  id: z.number(),
  showId: z.number(),
  youtubePlatformId: z.string(),
  youtubePlatformCategoryId: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  videoDescriptionTemplate: z.string().nullable(),
  firstCommentTemplate: z.string().nullable(),
  languageCode: z.string(),
  createdAt: z.string().nullable(),
  updatedAt: z.string().nullable(),
});

export const ListYouTubeChannelsResponseSchema = z.object({
  channels: z.array(YouTubeChannelSchema),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    totalItems: z.number(),
    totalPages: z.number(),
  }),
});