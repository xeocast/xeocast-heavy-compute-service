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
} from '../schemas/geminiSchemas';
import { generateArticleHandler } from '../handlers/gemini/generateArticleHandler';
// New Handlers
import { generateEvergreenTitlesHandler } from '../handlers/gemini/generateEvergreenTitlesHandler';
import { generateNewsTitlesHandler } from '../handlers/gemini/generateNewsTitlesHandler';
import { generateSeriesTitlesHandler } from '../handlers/gemini/generateSeriesTitlesHandler';
import { generateArticleMetadataHandler } from '../handlers/gemini/generateArticleMetadataHandler';
import { generateEpisodeScriptHandler } from '../handlers/gemini/generateEpisodeScriptHandler';
import { generateEpisodeAudioHandler } from '../handlers/gemini/generateEpisodeAudioHandler';
import { generateThumbnailImageHandler } from '../handlers/gemini/generateThumbnailImageHandler';
import { generateArticleImageHandler } from '../handlers/gemini/generateArticleImageHandler';
import { generateIntroMusicHandler } from '../handlers/gemini/generateIntroMusicHandler';
import { generateBackgroundMusicHandler } from '../handlers/gemini/generateBackgroundMusicHandler';
import { bearerAuth } from '../middlewares/auth';

const geminiRoutes = new OpenAPIHono<{ Variables: {} }>();

// Apply middleware specifically to the paths that need them.
// Order matters: auth first, then validation.
geminiRoutes.use(generateArticleRoute.path, bearerAuth);
geminiRoutes.use(
  generateArticleRoute.path,
  zValidator('json', GenerateArticleRequestSchema)
);

// Define the OpenAPI route for generate-article
geminiRoutes.openapi(generateArticleRoute, generateArticleHandler);

// --- Register New Gemini Endpoints ---

// Helper array for applying middlewares
const newRouteConfigs = [
  { route: generateEvergreenTitlesRoute, handler: generateEvergreenTitlesHandler, requestSchema: BaseGeminiRequestSchema },
  { route: generateNewsTitlesRoute, handler: generateNewsTitlesHandler, requestSchema: BaseGeminiRequestSchema },
  { route: generateSeriesTitlesRoute, handler: generateSeriesTitlesHandler, requestSchema: BaseGeminiRequestSchema },
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
geminiRoutes.openapi(generateArticleMetadataRoute, generateArticleMetadataHandler);
geminiRoutes.openapi(generateEpisodeScriptRoute, generateEpisodeScriptHandler);
geminiRoutes.openapi(generateEpisodeAudioRoute, generateEpisodeAudioHandler);
geminiRoutes.openapi(generateThumbnailImageRoute, generateThumbnailImageHandler);
geminiRoutes.openapi(generateArticleImageRoute, generateArticleImageHandler);
geminiRoutes.openapi(generateIntroMusicRoute, generateIntroMusicHandler);
geminiRoutes.openapi(generateBackgroundMusicRoute, generateBackgroundMusicHandler);

// --- Register New Gemini Endpoints ---



export default geminiRoutes;
