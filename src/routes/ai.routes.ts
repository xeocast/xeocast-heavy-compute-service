import { OpenAPIHono } from '@hono/zod-openapi';
import { zValidator } from '@hono/zod-validator';
import {
  textRoute,
  TextRequestSchema,
  // New Schemas
  BaseAIRequestSchema, // For most new routes
  GenerateEpisodeAudioRequestSchema, // Specific for episode audio
  // New Route Objects
  GenerateStructuredTitlesRoute,
  GenerateStructuredTitlesRequestSchema,
  generateArticleMetadataRoute,
  generateEpisodeScriptRoute,
  generateEpisodeAudioRoute,
  generateThumbnailImageRoute,
  generateArticleImageRoute,
  generateBackgroundMusicRoute,
  GenerateEpisodeScriptRequestSchema,
} from '../schemas/ai.schemas.js';
import { textHandler } from '../handlers/ai/text.handler.js';
// New Handlers
import { titlesHandler } from '../handlers/ai/structured/titles.handler.js';
import { generateArticleMetadataHandler } from '../handlers/ai/structured/metadata.handler.js';
import { generateEpisodeScriptHandler } from '../handlers/ai/structured/script.handler.js';
import { generateEpisodeAudioHandler } from '../handlers/ai/multi-speaker-speech.js';
import { generateThumbnailImageHandler } from '../handlers/ai/image.handler.js';
import { generateArticleImageHandler } from '../handlers/ai/music.handler.js';
import { generateBackgroundMusicHandler } from '../handlers/ai/video.handler.js';
import { bearerAuth } from '../middlewares/auth.js';

export const aiRoutes = new OpenAPIHono<{ Variables: {} }>();

// --- Register New Gemini Endpoints ---

// Helper array for applying middlewares
const newRouteConfigs = [
  { route: GenerateStructuredTitlesRoute, handler: titlesHandler, requestSchema: GenerateStructuredTitlesRequestSchema },
  { route: textRoute, handler: textHandler, requestSchema: TextRequestSchema },
  { route: generateArticleMetadataRoute, handler: generateArticleMetadataHandler, requestSchema: BaseAIRequestSchema },
  { route: generateEpisodeScriptRoute, handler: generateEpisodeScriptHandler, requestSchema: GenerateEpisodeScriptRequestSchema },
  { route: generateEpisodeAudioRoute, handler: generateEpisodeAudioHandler, requestSchema: GenerateEpisodeAudioRequestSchema },
  { route: generateThumbnailImageRoute, handler: generateThumbnailImageHandler, requestSchema: BaseAIRequestSchema },
  { route: generateArticleImageRoute, handler: generateArticleImageHandler, requestSchema: BaseAIRequestSchema },
  { route: generateBackgroundMusicRoute, handler: generateBackgroundMusicHandler, requestSchema: BaseAIRequestSchema },
];

// Apply middlewares in a loop
newRouteConfigs.forEach(({ route, requestSchema }) => {
  aiRoutes.use(route.path, bearerAuth);
  aiRoutes.use(route.path, zValidator('json', requestSchema));
});

// Define OpenAPI routes individually for type safety
aiRoutes.openapi(GenerateStructuredTitlesRoute, titlesHandler);
aiRoutes.openapi(textRoute, textHandler);
aiRoutes.openapi(generateArticleMetadataRoute, generateArticleMetadataHandler);
aiRoutes.openapi(generateEpisodeScriptRoute, generateEpisodeScriptHandler);
aiRoutes.openapi(generateEpisodeAudioRoute, generateEpisodeAudioHandler);
aiRoutes.openapi(generateThumbnailImageRoute, generateThumbnailImageHandler);
aiRoutes.openapi(generateArticleImageRoute, generateArticleImageHandler);
aiRoutes.openapi(generateBackgroundMusicRoute, generateBackgroundMusicHandler);

export default aiRoutes;
