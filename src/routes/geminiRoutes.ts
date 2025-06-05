import { OpenAPIHono } from '@hono/zod-openapi';
import { zValidator } from '@hono/zod-validator';
import {
  generateArticleRoute,
  GenerateArticleRequestSchema,
  // New Schemas
  BaseGeminiRequestSchema, // For most new routes
  GenerateEpisodeAudioRequestSchema, // Specific for episode audio
  // New Route Objects
  generateEvergreenTitlesRoute,
  generateNewsTitlesRoute,
  generateSeriesTitlesRoute,
  generateArticleMetadataRoute,
  generateEpisodeScriptRoute,
  generateEpisodeAudioRoute,
  generateThumbnailImageRoute,
  generateArticleImageRoute,
  generateIntroMusicRoute,
  generateBackgroundMusicRoute,
  GenerateEpisodeScriptRequestSchema,
} from '../schemas/geminiSchemas.js';
import { generateArticleHandler } from '../handlers/gemini/generateArticleHandler.js';
// New Handlers
import { generateEvergreenTitlesHandler } from '../handlers/gemini/generateEvergreenTitlesHandler.js';
import { generateNewsTitlesHandler } from '../handlers/gemini/generateNewsTitlesHandler.js';
import { generateSeriesTitlesHandler } from '../handlers/gemini/generateSeriesTitlesHandler.js';
import { generateArticleMetadataHandler } from '../handlers/gemini/generateArticleMetadataHandler.js';
import { generateEpisodeScriptHandler } from '../handlers/gemini/generateEpisodeScriptHandler.js';
import { generateEpisodeAudioHandler } from '../handlers/gemini/generateEpisodeAudioHandler.js';
import { generateThumbnailImageHandler } from '../handlers/gemini/generateThumbnailImageHandler.js';
import { generateArticleImageHandler } from '../handlers/gemini/generateArticleImageHandler.js';
import { generateIntroMusicHandler } from '../handlers/gemini/generateIntroMusicHandler.js';
import { generateBackgroundMusicHandler } from '../handlers/gemini/generateBackgroundMusicHandler.js';
import { bearerAuth } from '../middlewares/auth.js';

const geminiRoutes = new OpenAPIHono<{ Variables: {} }>();

// --- Register New Gemini Endpoints ---

// Helper array for applying middlewares
const newRouteConfigs = [
  { route: generateEvergreenTitlesRoute, handler: generateEvergreenTitlesHandler, requestSchema: BaseGeminiRequestSchema },
  { route: generateNewsTitlesRoute, handler: generateNewsTitlesHandler, requestSchema: BaseGeminiRequestSchema },
  { route: generateSeriesTitlesRoute, handler: generateSeriesTitlesHandler, requestSchema: BaseGeminiRequestSchema },
  { route: generateArticleRoute, handler: generateArticleHandler, requestSchema: GenerateArticleRequestSchema },
  { route: generateArticleMetadataRoute, handler: generateArticleMetadataHandler, requestSchema: BaseGeminiRequestSchema },
  { route: generateEpisodeScriptRoute, handler: generateEpisodeScriptHandler, requestSchema: GenerateEpisodeScriptRequestSchema },
  { route: generateEpisodeAudioRoute, handler: generateEpisodeAudioHandler, requestSchema: GenerateEpisodeAudioRequestSchema },
  { route: generateThumbnailImageRoute, handler: generateThumbnailImageHandler, requestSchema: BaseGeminiRequestSchema },
  { route: generateArticleImageRoute, handler: generateArticleImageHandler, requestSchema: BaseGeminiRequestSchema },
  { route: generateIntroMusicRoute, handler: generateIntroMusicHandler, requestSchema: BaseGeminiRequestSchema },
  { route: generateBackgroundMusicRoute, handler: generateBackgroundMusicHandler, requestSchema: BaseGeminiRequestSchema },
];

// Apply middlewares in a loop
newRouteConfigs.forEach(({ route, requestSchema }) => {
  geminiRoutes.use(route.path, bearerAuth);
  geminiRoutes.use(route.path, zValidator('json', requestSchema));
});

// Define OpenAPI routes individually for type safety
geminiRoutes.openapi(generateEvergreenTitlesRoute, generateEvergreenTitlesHandler);
geminiRoutes.openapi(generateNewsTitlesRoute, generateNewsTitlesHandler);
geminiRoutes.openapi(generateSeriesTitlesRoute, generateSeriesTitlesHandler);
geminiRoutes.openapi(generateArticleRoute, generateArticleHandler);
geminiRoutes.openapi(generateArticleMetadataRoute, generateArticleMetadataHandler);
geminiRoutes.openapi(generateEpisodeScriptRoute, generateEpisodeScriptHandler);
geminiRoutes.openapi(generateEpisodeAudioRoute, generateEpisodeAudioHandler);
geminiRoutes.openapi(generateThumbnailImageRoute, generateThumbnailImageHandler);
geminiRoutes.openapi(generateArticleImageRoute, generateArticleImageHandler);
geminiRoutes.openapi(generateIntroMusicRoute, generateIntroMusicHandler);
geminiRoutes.openapi(generateBackgroundMusicRoute, generateBackgroundMusicHandler);

// --- Register New Gemini Endpoints ---



export default geminiRoutes;
