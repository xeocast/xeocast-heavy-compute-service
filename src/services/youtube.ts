import { Innertube } from 'youtubei.js';

/**
 * Finds a YouTube video ID by its title within a specific channel.
 * @param channelId The ID of the YouTube channel to search in.
 * @param videoTitle The title of the video to find.
 * @returns The video ID if found, otherwise null.
 */
export const findVideoIdByTitle = async (
	channelId: string,
	videoTitle: string,
): Promise<string | null> => {
	try {
		const youtube = await Innertube.create();

		const channel = await youtube.getChannel(channelId);

		const videos = await channel.getVideos();

		// The videos array can contain different types of items (videos, shorts, etc.).
		// Not all items have a `title` or `id` property in the same structure.
		// We cast to `any` and use optional chaining (`?.`) for safe property access.
		const video = videos.videos.find((v: any) => v?.title?.text === videoTitle);

		// If a video is found, we ensure it has an `id` of type string before returning it.
		if (video && typeof (video as any).id === 'string') {
			return (video as any).id;
		}

		console.log(`Video with title "${videoTitle}" not found in channel ${channelId}.`);
		return null;
	} catch (error) {
		console.error('Error finding video on YouTube:', error);
		return null;
	}
};