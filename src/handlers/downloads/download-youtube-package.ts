import { Context } from 'hono';
import { z } from 'zod';
import { zipSync, strToU8 } from 'fflate';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

import { ErrorSchema } from '../../schemas/ai.schemas.js';
import { DownloadYouTubePackagePathParamsSchema } from '../../schemas/download.schemas.js';
import { StatusCode } from 'hono/utils/http-status';
import { HTTPException } from 'hono/http-exception';

// Define the CloudflareEnv interface to include R2 environment variables
export interface CloudflareEnv {
    R2_ENDPOINT_URL: string;
    R2_RW_ACCESS_KEY_ID: string;
    R2_RW_SECRET_ACCESS_KEY: string;
    R2_EPISODE_PROJECTS_BUCKET: string;
    DASH_API_URL: string;
}

const EpisodeApiResponseSchema = z.object({
    videoBucketKey: z.string().nullable().optional(),
    thumbnailBucketKey: z.string().nullable().optional(),
    backgroundBucketKey: z.string().nullable().optional(),
    slug: z.string().optional(),
    title: z.string().optional(),
    description: z.string().nullable().optional(),
    scheduledPublishAt: z.string().nullable().optional(),
    showId: z.number().optional(),
    seriesId: z.number().nullable().optional(),
});

const SeriesApiResponseSchema = z.object({
    slug: z.string(),
    title: z.string(),
});

const ShowApiResponseSchema = z.object({
    name: z.string(),
});

const EpisodeDownloadInfoSchema = z.object({
    videoBucketKey: z.string().nullable().optional(),
    thumbnailBucketKey: z.string().nullable().optional(),
    backgroundBucketKey: z.string().nullable().optional(),
    episodeSlug: z.string().optional(),
    episodeTitle: z.string().optional(),
    episodeDescription: z.string().nullable().optional(),
    scheduledPublishAt: z.string().nullable().optional(),
    seriesSlug: z.string().optional(),
    seriesTitle: z.string().optional(),
    showName: z.string(),
    showId: z.number().optional(),
    seriesId: z.number().nullable().optional(),
});

export const downloadYouTubePackageHandler = async (
    c: Context<{ Bindings: CloudflareEnv }>,
) => {
    const { id } = c.req.param();

    const dashApiUrl = process.env.DASH_API_URL;
    if (!dashApiUrl) {
        throw new HTTPException(500, { message: 'DASH_API_URL environment variable is not set.' });
    }

    const paramParseResult = DownloadYouTubePackagePathParamsSchema.safeParse({ id });

    if (!paramParseResult.success) {
        return c.json(ErrorSchema.parse({ error: 'Invalid episode ID format.' }), 400);
    }

    try {
        // Fetch episode data
        const episodeResponse = await fetch(`${dashApiUrl}/episodes/${id}`, {
            headers: {
                'Cookie': c.req.header('Cookie') || '',
            },
        });
        if (!episodeResponse.ok) {
            c.status(episodeResponse.status as StatusCode);
            const errorData = await episodeResponse.json();
            return c.json(ErrorSchema.parse({ error: String(errorData.message || 'Failed to fetch episode details.') }));
        }
        const rawEpisodeResponse = await episodeResponse.json();

        const episodeData = EpisodeApiResponseSchema.parse(rawEpisodeResponse.episode);

        // If the API returns an empty object for a non-existent episode, treat it as not found.
        if (!episodeData.slug) {
            c.status(404);
            return c.json(ErrorSchema.parse({ error: 'Episode not found.' }));
        }

        // Fetch series data
        let seriesData: z.infer<typeof SeriesApiResponseSchema> | undefined;
        if (episodeData.seriesId) {
            const seriesResponse = await fetch(`${dashApiUrl}/series/${episodeData.seriesId}`, {
                headers: {
                    'Cookie': c.req.header('Cookie') || '',
                },
            });
            if (!seriesResponse.ok) {
                c.status(seriesResponse.status as StatusCode);
                const errorData = await seriesResponse.json();
                return c.json(ErrorSchema.parse({ error: String(errorData.message || 'Failed to fetch series details.') }));
            }
            const rawSeriesResponse = await seriesResponse.json();
            seriesData = SeriesApiResponseSchema.parse(rawSeriesResponse.series);
        }

        // Fetch show data
        const showResponse = await fetch(`${dashApiUrl}/shows/${episodeData.showId}`, {
            headers: {
                'Cookie': c.req.header('Cookie') || '',
            },
        });
        if (!showResponse.ok) {
            c.status(showResponse.status as StatusCode);
            const errorData = await showResponse.json();
            return c.json(ErrorSchema.parse({ error: String(errorData.message || 'Failed to fetch show details.') }));
        }
        const rawShowResponse = await showResponse.json();
        const showData = ShowApiResponseSchema.parse(rawShowResponse.show);

        const episodeInfo: z.infer<typeof EpisodeDownloadInfoSchema> = {
            videoBucketKey: episodeData.videoBucketKey,
            thumbnailBucketKey: episodeData.thumbnailBucketKey,
            backgroundBucketKey: episodeData.backgroundBucketKey,
            episodeSlug: episodeData.slug,
            episodeTitle: episodeData.title,
            episodeDescription: episodeData.description,
            scheduledPublishAt: episodeData.scheduledPublishAt,
            seriesSlug: seriesData?.slug || 'no-series',
            seriesTitle: seriesData?.title || 'No Series',
            showName: showData.name,
            showId: episodeData.showId,
        };

        const s3Client = new S3Client({
            endpoint: process.env.R2_ENDPOINT_URL,
            region: 'auto',
            credentials: {
                accessKeyId: process.env.R2_RW_ACCESS_KEY_ID!,
                secretAccessKey: process.env.R2_RW_SECRET_ACCESS_KEY!,
            },
        });

        const filesToZip: Record<string, Uint8Array> = {};

        // Add text files
        filesToZip['title.txt'] = strToU8(episodeInfo.episodeTitle ?? '');
        filesToZip['series.txt'] = strToU8(episodeInfo.seriesTitle ?? '');
        if (episodeInfo.episodeDescription) {
            filesToZip['description.txt'] = strToU8(episodeInfo.episodeDescription);
        }
        if (episodeInfo.scheduledPublishAt) {
            filesToZip['scheduled.txt'] = strToU8(episodeInfo.scheduledPublishAt);
        }
        filesToZip['show.txt'] = strToU8(episodeInfo.showName);

        // Add video file
        if (episodeInfo.videoBucketKey) {
            const videoCommand = new GetObjectCommand({
                Bucket: process.env.R2_EPISODE_PROJECTS_BUCKET,
                Key: episodeInfo.videoBucketKey,
            });
            const videoResponse = await s3Client.send(videoCommand);

            if (!videoResponse.Body) {
                c.status(404);
                return c.json(ErrorSchema.parse({ error: 'Video content not found in R2.' }));
            }
            filesToZip['video.mp4'] = await videoResponse.Body.transformToByteArray();
        } else {
            c.status(404);

            return c.json(ErrorSchema.parse({ error: 'Video bucket key not found for episode.' }));
        }

        // Add thumbnail file
        if (episodeInfo.thumbnailBucketKey) {
            const thumbnailCommand = new GetObjectCommand({
                Bucket: process.env.R2_EPISODE_PROJECTS_BUCKET,
                Key: episodeInfo.thumbnailBucketKey,
            });
            const thumbnailResponse = await s3Client.send(thumbnailCommand);
            if (thumbnailResponse.Body) {
                filesToZip['thumbnail.jpg'] = await thumbnailResponse.Body.transformToByteArray();
            }
        }

        // Add background file
        if (episodeInfo.backgroundBucketKey) {
            const backgroundCommand = new GetObjectCommand({
                Bucket: process.env.R2_EPISODE_PROJECTS_BUCKET,
                Key: episodeInfo.backgroundBucketKey,
            });
            const backgroundResponse = await s3Client.send(backgroundCommand);
            if (backgroundResponse.Body) {
                filesToZip['background.jpg'] = await backgroundResponse.Body.transformToByteArray();
            }
        }

        const zipData = zipSync(filesToZip);

        // Update episode status via API
        const updateEpisodeResponse = await fetch(`${dashApiUrl}/episodes/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': c.req.header('Cookie') || '',
            },
            body: JSON.stringify({
                statusOnYoutube: 'public',
                freezeStatus: true,
            }),
        });

        if (!updateEpisodeResponse.ok) {
            console.error('Failed to update episode status:', await updateEpisodeResponse.text());
            c.status(updateEpisodeResponse.status as StatusCode);
            return c.json(ErrorSchema.parse({ message: `Failed to update episode status: ${updateEpisodeResponse.statusText}` }));
        }

        const zipFileName = `${episodeInfo.seriesSlug}-${episodeInfo.episodeSlug}-yt-pkg.zip`;

        return new Response(zipData, {
            headers: {
                'Content-Type': 'application/zip',
                'Content-Disposition': `attachment; filename="${zipFileName}"`,
            },
        });
    } catch (error) {
        console.error(`Failed to generate YT package for episode ${id}:`, error);
        c.status(500);
        return c.json(ErrorSchema.parse({ error: 'Failed to generate YouTube package.' }));
    }
};