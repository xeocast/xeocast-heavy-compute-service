import { Context } from 'hono';
import { z } from 'zod';
import { zipSync, strToU8 } from 'fflate';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { ErrorSchema } from '../../schemas/ai.schemas.js';
import { DownloadXPackagePathParamsSchema, ListYouTubeChannelsResponseSchema } from '../../schemas/download.schemas.js';
import { StatusCode } from 'hono/utils/http-status';
import { findVideoIdByTitle } from '../../services/youtube.js';
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
    videoBucketKey: z.string().nullable(), // video_bucket_key can be null
    slug: z.string(), // episodeSlug
    title: z.string(), // episodeTitle
    description: z.string().nullable(), // episodeDescription
    scheduledPublishAt: z.string().nullable(),
    showId: z.number(),
    seriesId: z.number().nullable(), // series_id can be null
});

const SeriesApiResponseSchema = z.object({
    slug: z.string(), // seriesSlug
    title: z.string(), // seriesTitle
});

const ShowApiResponseSchema = z.object({
    name: z.string(), // showName
});

const EpisodeDownloadInfoSchema = z.object({
    videoBucketKey: z.string().nullable(),
    episodeSlug: z.string(),
    episodeTitle: z.string(),
    episodeDescription: z.string().nullable(),
    scheduledPublishAt: z.string().nullable(),
    seriesSlug: z.string(),
    seriesTitle: z.string(),
    showName: z.string(),
    showId: z.number(),
});

export const downloadXPackageHandler = async (
    c: Context<{ Bindings: CloudflareEnv }>
): Promise<any> => {
    const paramParseResult = DownloadXPackagePathParamsSchema.safeParse(c.req.param());

    if (!process.env.DASH_API_URL) {
        throw new HTTPException(500, { message: 'DASH_API_URL environment variable is not set' });
    }

    const dashApiUrl = process.env.DASH_API_URL;

    if (!paramParseResult.success) {
        c.status(400);
        return c.json(ErrorSchema.parse({ message: 'Invalid episode ID format.' }));
    }

    const { id } = paramParseResult.data;

    try {
        const episodeApiResponse = await fetch(`${dashApiUrl}/episodes/${id}`, {
            headers: {
                'Cookie': c.req.header('Cookie') || '',
            },
        });

        if (!episodeApiResponse.ok) {
            c.status(episodeApiResponse.status as StatusCode);
            return c.json(ErrorSchema.parse({ message: `Failed to fetch episode info: ${episodeApiResponse.statusText}` }));
        }

        const episodeData = await episodeApiResponse.json();
        const parsedEpisode = EpisodeApiResponseSchema.parse(episodeData.episode);

        let seriesSlug = '';
        let seriesTitle = '';
        if (parsedEpisode.seriesId) {
            const seriesApiResponse = await fetch(`${dashApiUrl}/series/${parsedEpisode.seriesId}`, {
                headers: {
                    'Cookie': c.req.header('Cookie') || '',
                },
            });
            if (!seriesApiResponse.ok) {
                c.status(seriesApiResponse.status as StatusCode);
                return c.json(ErrorSchema.parse({ message: `Failed to fetch series info: ${seriesApiResponse.statusText}` }));
            }
            const seriesData = await seriesApiResponse.json();
            const parsedSeries = SeriesApiResponseSchema.parse(seriesData.series);
            seriesSlug = parsedSeries.slug;
            seriesTitle = parsedSeries.title;
        }

        const showApiResponse = await fetch(`${dashApiUrl}/shows/${parsedEpisode.showId}`, {
            headers: {
                'Cookie': c.req.header('Cookie') || '',
            },
        });
        if (!showApiResponse.ok) {
            c.status(showApiResponse.status as StatusCode);
            return c.json(ErrorSchema.parse({ message: `Failed to fetch show info: ${showApiResponse.statusText}` }));
        }
        const showData = await showApiResponse.json();
        const parsedShow = ShowApiResponseSchema.parse(showData.show);

        const episodeInfo = EpisodeDownloadInfoSchema.parse({
            videoBucketKey: parsedEpisode.videoBucketKey,
            episodeSlug: parsedEpisode.slug,
            episodeTitle: parsedEpisode.title,
            episodeDescription: parsedEpisode.description,
            scheduledPublishAt: parsedEpisode.scheduledPublishAt,
            seriesSlug: seriesSlug,
            seriesTitle: seriesTitle,
            showName: parsedShow.name,
            showId: parsedEpisode.showId,
        });

        const s3Client = new S3Client({
            endpoint: process.env.R2_ENDPOINT_URL,
            region: 'auto', // R2 regions are 'auto'
            credentials: {
                accessKeyId: process.env.R2_RW_ACCESS_KEY_ID!,
                secretAccessKey: process.env.R2_RW_SECRET_ACCESS_KEY!,
            },
        });

        const filesToZip: Record<string, Uint8Array> = {};

        // Add text files
        filesToZip['title.txt'] = strToU8(episodeInfo.episodeTitle);
        filesToZip['series.txt'] = strToU8(episodeInfo.seriesTitle);
        if (episodeInfo.episodeDescription) {
            filesToZip['description.txt'] = strToU8(episodeInfo.episodeDescription);
        }
        if (episodeInfo.scheduledPublishAt) {
            filesToZip['scheduled.txt'] = strToU8(episodeInfo.scheduledPublishAt);
        }

        const postText = `🚀 NEW EPISODE: "${episodeInfo.episodeTitle}" is here! 🎧\n\nCheck out the latest discussion on "${episodeInfo.seriesTitle}" from the show "${episodeInfo.showName}".\n\n${episodeInfo.episodeDescription || 'Find out more in the episode!'}`.trim();

        filesToZip['post.txt'] = strToU8(postText);

        // Add video file from R2
        if (!episodeInfo.videoBucketKey) {
            c.status(404);
            return c.json(ErrorSchema.parse({ message: 'Episode video bucket key is missing.' }));
        }

        const getObjectCommand = new GetObjectCommand({
            Bucket: process.env.R2_EPISODE_PROJECTS_BUCKET!,
            Key: episodeInfo.videoBucketKey,
        });

        const videoObject = await s3Client.send(getObjectCommand);

        if (!videoObject.Body) {
            c.status(404);
            return c.json(ErrorSchema.parse({ message: 'Episode video file not found in R2.' }));
        }
        filesToZip['video.mp4'] = new Uint8Array(await videoObject.Body.transformToByteArray());

        // Add first-comment.txt if a YouTube video ID can be found
        const youtubeChannelApiResponse = await fetch(`${dashApiUrl}/youtube-channels?showId=${episodeInfo.showId}&limit=1`, {
            headers: {
                'Cookie': c.req.header('Cookie') || '',
            },
        });

        if (youtubeChannelApiResponse.ok) {
            const youtubeChannelData = ListYouTubeChannelsResponseSchema.parse(await youtubeChannelApiResponse.json());
            const youtubePlatformId = youtubeChannelData.channels[0]?.youtubePlatformId;

            if (youtubePlatformId) {
                const videoId = await findVideoIdByTitle(youtubePlatformId, episodeInfo.episodeTitle);
                if (videoId) {
                    const commentText = `You can also listen to this podcast episode on YouTube\n\nhttps://www.youtube.com/watch?v=${videoId}`;
                    filesToZip['first-comment.txt'] = strToU8(commentText);
                }
            }
        }

        const zipFile = zipSync(filesToZip);

        // Update episode status via API
        const updateEpisodeResponse = await fetch(`${dashApiUrl}/episodes/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': c.req.header('Cookie') || '',
            },
            body: JSON.stringify({
                statusOnX: 'public',
                freezeStatus: true,
            }),
        });

        if (!updateEpisodeResponse.ok) {
            console.error('Failed to update episode status:', await updateEpisodeResponse.text());
            c.status(updateEpisodeResponse.status as StatusCode);
            return c.json(ErrorSchema.parse({ message: `Failed to update episode status: ${updateEpisodeResponse.statusText}` }));
        }

        const zipFileName = `${episodeInfo.seriesSlug}-${episodeInfo.episodeSlug}.zip`;

        return new Response(zipFile, {
            headers: {
                'Content-Type': 'application/zip',
                'Content-Disposition': `attachment; filename="${zipFileName}"`,
            },
        });

    } catch (error) {
        console.error('Error downloading X package:', error);
        c.status(500);
        return c.json(ErrorSchema.parse({ message: 'An unexpected error occurred.' }));
    }
};
