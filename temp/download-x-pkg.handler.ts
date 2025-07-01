import { Context } from 'hono';
import { z } from 'zod';
import { zipSync, strToU8 } from 'fflate';
import type { CloudflareEnv } from '../../env';
import { EpisodeNotFoundErrorSchema } from '../../schemas/episode.schemas';
import { PathIdParamSchema, GeneralServerErrorSchema } from '../../schemas/common.schemas';
import { getR2Bucket } from '../storage/utils';
import { findVideoIdByTitle } from '../../utils/youtube';

const EpisodeDownloadInfoSchema = z.object({
	videoBucketKey: z.string(),
	episodeSlug: z.string(),
	episodeTitle: z.string(),
	episodeDescription: z.string().nullable(),
	scheduledPublishAt: z.string().nullable(),
	seriesSlug: z.string(),
	seriesTitle: z.string(),
	showName: z.string(),
	showId: z.number(),
});

const YoutubeChannelResultSchema = z.object({
	youtubePlatformId: z.string(),
});

export const downloadXPackageHandler = async (c: Context<{ Bindings: CloudflareEnv }>) => {
	const paramParseResult = PathIdParamSchema.safeParse(c.req.param());

	if (!paramParseResult.success) {
		return c.json(EpisodeNotFoundErrorSchema.parse({ message: 'Invalid episode ID format.' }), 400);
	}

	const { id } = paramParseResult.data;

	try {
		const stmt = c.env.DB.prepare(`
      SELECT
        e.video_bucket_key AS videoBucketKey,
        e.slug AS episodeSlug,
        e.title AS episodeTitle,
        e.description AS episodeDescription,
        e.scheduled_publish_at as scheduledPublishAt,
        s.slug AS seriesSlug,
        s.title AS seriesTitle,
        sh.name as showName,
        e.show_id AS showId
      FROM episodes AS e
      JOIN series AS s ON e.series_id = s.id
      JOIN shows AS sh ON e.show_id = sh.id
      WHERE e.id = ?1
    `);
		const dbResult = await stmt.bind(id).first();

		if (!dbResult) {
			return c.json(EpisodeNotFoundErrorSchema.parse({ message: 'Episode not found.' }), 404);
		}

		const episodeInfo = EpisodeDownloadInfoSchema.parse(dbResult);

		const bucket = getR2Bucket(c, 'EPISODE_PROJECTS_BUCKET');
		if (!bucket) {
			return c.json(GeneralServerErrorSchema.parse({ message: 'Episode projects bucket not configured.' }), 500);
		}

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

		const postText = `🚀 NEW EPISODE: "${episodeInfo.episodeTitle}" is here! 🎧

Check out the latest discussion on "${episodeInfo.seriesTitle}" from the show "${episodeInfo.showName}".

${episodeInfo.episodeDescription || 'Find out more in the episode!'}`.trim();

		filesToZip['post.txt'] = strToU8(postText);

		// Add video file
		const videoObject = await bucket.get(episodeInfo.videoBucketKey);
		if (!videoObject) {
			return c.json(EpisodeNotFoundErrorSchema.parse({ message: 'Episode video file not found.' }), 404);
		}
		filesToZip['video.mp4'] = new Uint8Array(await videoObject.arrayBuffer());

		// Add first-comment.txt
		const ytChannelStmt = c.env.DB.prepare('SELECT youtube_platform_id as youtubePlatformId FROM youtube_channels WHERE show_id = ?1');
		const ytChannelResult = await ytChannelStmt.bind(episodeInfo.showId).first();
		console.log({ytChannelResult});

		if (ytChannelResult) {
			const parsedYtChannel = YoutubeChannelResultSchema.parse(ytChannelResult);
			console.log({parsedYtChannel});
			const videoId = await findVideoIdByTitle(parsedYtChannel.youtubePlatformId, episodeInfo.episodeTitle);
			console.log({videoId});

			if (videoId) {
				const commentText = `You can also listen to this podcast episode on YouTube\n\nhttps://www.youtube.com/watch?v=${videoId}`;
				filesToZip['first-comment.txt'] = strToU8(commentText);
			}
		}

		const zipFile = zipSync(filesToZip);

		const updateStmt = c.env.DB.prepare(`
			UPDATE episodes
			SET status_on_x = 'public', freeze_status = 1
			WHERE id = ?1
		`);
		await updateStmt.bind(id).run();

		const zipFileName = `${episodeInfo.seriesSlug}-${episodeInfo.episodeSlug}.zip`;

		return new Response(zipFile, {
			headers: {
				'Content-Type': 'application/zip',
				'Content-Disposition': `attachment; filename="${zipFileName}"`,
			},
		});

	} catch (error) {
		console.error('Error downloading X package:', error);
		return c.json(GeneralServerErrorSchema.parse({ message: 'An unexpected error occurred.' }), 500);
	}
};
