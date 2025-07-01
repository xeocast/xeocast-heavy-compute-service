import { Context } from 'hono';
import { z } from 'zod';
import { zipSync, strToU8 } from 'fflate';
import type { CloudflareEnv } from '../../env';
import {
  EpisodeNotFoundErrorSchema
} from '../../schemas/episode.schemas';
import { PathIdParamSchema, GeneralServerErrorSchema } from '../../schemas/common.schemas';
import { getR2Bucket } from '../storage/utils';

const EpisodeDownloadInfoSchema = z.object({
	videoBucketKey: z.string(),
	thumbnailBucketKey: z.string().nullable(),
	backgroundBucketKey: z.string().nullable(),
	episodeSlug: z.string(),
	episodeTitle: z.string(),
	episodeDescription: z.string().nullable(),
	scheduledPublishAt: z.string().nullable(),
	seriesSlug: z.string(),
	seriesTitle: z.string(),
});

export const downloadYtPackageHandler = async (c: Context<{ Bindings: CloudflareEnv }>) => {
	const paramParseResult = PathIdParamSchema.safeParse(c.req.param());

	if (!paramParseResult.success) {
		return c.json(EpisodeNotFoundErrorSchema.parse({ message: 'Invalid episode ID format.' }), 400);
	}

	const { id } = paramParseResult.data;

	try {
		const stmt = c.env.DB.prepare(`
      SELECT
        e.video_bucket_key AS videoBucketKey,
        e.thumbnail_bucket_key as thumbnailBucketKey,
        e.background_bucket_key as backgroundBucketKey,
        e.slug AS episodeSlug,
        e.title AS episodeTitle,
        e.description AS episodeDescription,
        e.scheduled_publish_at as scheduledPublishAt,
        s.slug AS seriesSlug,
        s.title AS seriesTitle
      FROM episodes AS e
      JOIN series AS s ON e.series_id = s.id
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

		// Add video file
		const videoObject = await bucket.get(episodeInfo.videoBucketKey);
		if (!videoObject) {
			return c.json(EpisodeNotFoundErrorSchema.parse({ message: 'Episode video file not found.' }), 404);
		}
		filesToZip['video.mp4'] = new Uint8Array(await videoObject.arrayBuffer());

		// Add thumbnail file
		if (episodeInfo.thumbnailBucketKey) {
			const thumbnailObject = await bucket.get(episodeInfo.thumbnailBucketKey);
			if (thumbnailObject) {
				filesToZip['thumbnail.jpg'] = new Uint8Array(await thumbnailObject.arrayBuffer());
			}
		}

		// Add background file
		if (episodeInfo.backgroundBucketKey) {
			const backgroundObject = await bucket.get(episodeInfo.backgroundBucketKey);
			if (backgroundObject) {
				filesToZip['background.jpg'] = new Uint8Array(await backgroundObject.arrayBuffer());
			}
		}

		const zipData = zipSync(filesToZip);

		// Update episode status
		const updateStmt = c.env.DB.prepare(`
			UPDATE episodes
			SET status_on_youtube = 'public', freeze_status = 1
			WHERE id = ?1
		`);
		await updateStmt.bind(id).run();

		const zipFileName = `${episodeInfo.seriesSlug}-${episodeInfo.episodeSlug}-yt-pkg.zip`;

		return new Response(zipData, {
			headers: {
				'Content-Type': 'application/zip',
				'Content-Disposition': `attachment; filename="${zipFileName}"`,
			},
		});

	} catch (error) {
		console.error(`Failed to generate YT package for episode ${id}:`, error);
		return c.json(GeneralServerErrorSchema.parse({ message: 'Failed to generate YouTube package.' }), 500);
	}
};
