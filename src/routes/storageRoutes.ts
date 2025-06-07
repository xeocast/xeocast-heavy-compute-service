// src/routes/storageRoutes.ts
import { OpenAPIHono, createRoute } from '@hono/zod-openapi';
import { uploadObjectHandler } from '../handlers/storage/uploadObject.handler.js';
import {
    UploadObjectFormSchema,
    UploadObjectSuccessResponseSchema,
    GeneralErrorSchema, // Using a general error for 400/500 for now
    // Specific error schemas can be added to the route definition if desired:
    // BucketNotFoundErrorSchema,
    // FileUploadErrorSchema,
    // R2OperationErrorSchema,
    // InvalidKeyErrorSchema,
    // InvalidCustomMetadataErrorSchema,
    // MissingContentTypeErrorSchema,
} from '../schemas/storageSchemas.js';

// Define Env type for Bindings to match the handler's expected environment variables.
// This ensures type compatibility between the router and the handler.
interface AppEnv {
    R2_ENDPOINT_URL: string;
    R2_RW_ACCESS_KEY_ID: string;
    R2_RW_SECRET_ACCESS_KEY: string;
    R2_EPISODE_PROJECTS_BUCKET: string;
    R2_DEFAULT_FILES_BUCKET: string;
    BEARER_TOKEN: string; // Assuming this is also part of your CloudflareEnv / .env
    GEMINI_API_KEY: string; // Assuming this is also part of your CloudflareEnv / .env
    [key: string]: any; // Allow other env vars that might be present
}

type Env = {
    Bindings: AppEnv;
    Variables: {}; // For Hono context variables, can be extended if needed
};

const storageRoutes = new OpenAPIHono<Env>();

// Define the POST /storage route
const uploadObjectRoute = createRoute({
    method: 'post',
    path: '/', // Will be prefixed with /storage in index.ts
    summary: 'Upload an object to R2 storage.',
    description: 'Uploads a file to a specified R2 bucket. Object key can be provided or will be auto-generated. Custom metadata can be included.',
    tags: ['Storage'],
    request: {
        body: {
            content: {
                'multipart/form-data': {
                    schema: UploadObjectFormSchema,
                },
            },
        },
    },
    responses: {
        201: {
            description: 'File uploaded successfully.',
            content: {
                'application/json': {
                    schema: UploadObjectSuccessResponseSchema,
                },
            },
        },
        400: {
            description: 'Bad Request - e.g., invalid input, missing file, schema validation error.',
            content: {
                'application/json': {
                    schema: GeneralErrorSchema, // Or more specific error schemas
                },
            },
        },
        500: {
            description: 'Internal Server Error - e.g., R2 operation failure.',
            content: {
                'application/json': {
                    schema: GeneralErrorSchema, // Or R2OperationErrorSchema
                },
            },
        },
    },
});

storageRoutes.openapi(uploadObjectRoute, uploadObjectHandler);

export default storageRoutes;
