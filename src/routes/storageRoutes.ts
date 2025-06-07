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

// Define a minimal Env type for Bindings if specific env vars are needed by routes in this file.
// For now, using a generic object as the handler itself doesn't expect specific bindings.
type Env = {
    Bindings: {}; // For Cloudflare Bindings, empty for now
    Variables: {}; // For Hono context variables, empty for now
};

const storageRoutes = new OpenAPIHono<{ Bindings: Env['Bindings'], Variables: Env['Variables'] }>();

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
