// src/schemas/storageSchemas.ts
import { z } from 'zod';

// Basic R2BucketName schema - can be refined later (e.g., with an enum)
export const R2BucketNameSchema = z.string().openapi({
    title: 'R2BucketName',
    description: 'Logical name of the target R2 bucket.',
    example: 'my-assets-bucket',
});

// Base MessageResponse schema (as commonSchemas.ts was not found)
export const MessageResponseSchema = z.object({
    success: z.boolean().openapi({ example: true }),
    message: z.string().openapi({ example: 'Operation successful.' }),
}).openapi('MessageResponse');

// Schema for the multipart/form-data upload request
// For OpenAPI documentation, Hono/zod-openapi treats file uploads as `type: 'string', format: 'binary'`.
// Actual validation of File instance will happen in the handler.
export const UploadObjectFormSchema = z.object({
    // 'file' will be handled as `c.req.formData()` which returns `File` instances or strings.
    // For schema definition, we describe it as a binary string for OpenAPI.
    // We cannot directly use z.instanceof(File) in the schema that Hono sends to OpenAPI.
    // The handler will perform the actual check for `instanceof File`.
    file: z.any().openapi({ type: 'string', format: 'binary', description: 'The file to upload.' }),
    bucket: R2BucketNameSchema.openapi({ description: 'Logical name of the target R2 bucket.' }),
    key: z.string().optional().openapi({ example: 'path/to/your/file.txt', description: 'Desired object key (path and filename). If not provided, a UUID will be generated.' }),
    contentType: z.string().optional().openapi({ example: 'image/png', description: 'MIME type of the file. If not sent, file.type from FormData is used.' }),
    customMetadata: z.string().optional().refine(
        (val) => {
            if (val === undefined) return true; // Optional field, valid if not present
            try {
                const parsed = JSON.parse(val);
                return typeof parsed === 'object' && parsed !== null; // Ensure it's an object
            } catch (e) {
                return false;
            }
        },
        { message: 'customMetadata must be a valid JSON string representing an object.' }
    ).openapi({type: 'string', format: 'json', example: '{\"userId\":\"123\", \"source\":\"uploadForm\"}', description: 'Stringified JSON object for custom R2 object metadata.'})
}).openapi('UploadObjectForm');

// Schema for successful object upload response
export const UploadObjectSuccessResponseSchema = MessageResponseSchema.extend({
    message: z.literal('File uploaded successfully.'),
    objectKey: z.string().openapi({
        example: 'unique-generated-key/file.jpg',
    }),
    bucket: R2BucketNameSchema,
    url: z.string().url().optional().openapi({
        description: 'Public URL if the bucket is public and a domain is configured.',
        example: 'https://your-r2-public-url/unique-generated-key/file.jpg',
    }),
}).openapi('UploadObjectSuccessResponse');

// Placeholder for other error schemas if needed in the future,
// based on the ones from the deleted handler.
export const GeneralErrorSchema = MessageResponseSchema.extend({
    success: z.literal(false),
    error: z.any().optional(),
}).openapi('GeneralError');

export const R2OperationErrorSchema = GeneralErrorSchema.extend({
    message: z.string().openapi({ example: 'An R2 operation failed.'}),
    details: z.string().optional().openapi({ example: 'Specific error from R2 client.'})
}).openapi('R2OperationError');

export const BucketNotFoundErrorSchema = GeneralErrorSchema.extend({
    message: z.literal('Bucket not found or not configured.'),
    bucketNameAttempted: z.string().optional()
}).openapi('BucketNotFoundError');

export const FileUploadErrorSchema = GeneralErrorSchema.extend({
    message: z.literal('File upload failed.')
}).openapi('FileUploadError');

export const InvalidKeyErrorSchema = GeneralErrorSchema.extend({
    message: z.literal('Provided object key is invalid.')
}).openapi('InvalidKeyError');

export const InvalidCustomMetadataErrorSchema = GeneralErrorSchema.extend({
    message: z.literal('Custom metadata is not a valid JSON string or structure.')
}).openapi('InvalidCustomMetadataError');

export const MissingContentTypeErrorSchema = GeneralErrorSchema.extend({
    message: z.literal('Content type for the file could not be determined and was not provided.')
}).openapi('MissingContentTypeError');
