// src/handlers/storage/uploadObject.handler.ts
import type { Handler } from 'hono';
import { z } from 'zod'; // Import z for ZodError
import { v4 as uuidv4 } from 'uuid'; // For generating keys
import { PutObjectCommand } from '@aws-sdk/client-s3'; // AWS SDK S3
import {
    R2BucketNameSchema,
    UploadObjectSuccessResponseSchema,
    FileUploadErrorSchema,
    BucketNotFoundErrorSchema,
    InvalidKeyErrorSchema,
    MissingContentTypeErrorSchema,
    InvalidCustomMetadataErrorSchema,
    R2OperationErrorSchema
} from '../../schemas/storageSchemas.js';
import { getS3BucketDetails } from './utils.js'; // Updated import

// Helper to sanitize the key (remains the same)
function sanitizeKey(key: string): string {
    // Remove leading/trailing slashes and replace multiple slashes with a single one
    let sanitized = key.trim().replace(/^\/+/, '').replace(/\/+$/, '').replace(/\/{2,}/g, '/');
    // Basic security: prevent path traversal by removing ../ sequences
    sanitized = sanitized.replace(/\.\.\//g, '');
    // Ensure key is not excessively long (R2 has a 1024 byte limit for object keys)
    if (new TextEncoder().encode(sanitized).length > 900) { // Leave some room for prefixes if any
        sanitized = sanitized.substring(0, sanitized.lastIndexOf('/', 850) || 850); // Try to cut at a slash
    }
    return sanitized;
}

// Define Env type for this handler. To ensure compatibility with the router's Env,
// it should include all keys defined in the router's AppEnv, even if not directly used here.
interface HandlerEnv {
    R2_ENDPOINT_URL: string;
    R2_RW_ACCESS_KEY_ID: string;
    R2_RW_SECRET_ACCESS_KEY: string;
    R2_EPISODE_PROJECTS_BUCKET: string;
    R2_DEFAULT_FILES_BUCKET: string;
    BEARER_TOKEN: string; // Included for type compatibility with router
    GEMINI_API_KEY: string; // Included for type compatibility with router
    [key: string]: any; // Allows other properties from the router's Env to be present
}

export const uploadObjectHandler: Handler<{
    Bindings: HandlerEnv, // Use the handler-specific Env interface
    Variables: {},
}> = async (c) => {
    try {
        const formData = await c.req.formData();

        const file = formData.get('file');
        const bucketNameInput = formData.get('bucket'); // This is the logical bucket name
        let keyInput = formData.get('key');
        let contentTypeInput = formData.get('contentType');
        const customMetadataInput = formData.get('customMetadata');

        if (!(file instanceof File)) {
            return c.json(FileUploadErrorSchema.parse({
                success: false,
                message: 'File upload failed. No file provided in the \'file\' field or invalid form data.'
            }), 400);
        }

        if (typeof bucketNameInput !== 'string' || bucketNameInput.trim() === '') {
             return c.json(FileUploadErrorSchema.parse({ // Re-using FileUploadErrorSchema
                success: false,
                message: 'Bucket name is required and must be a non-empty string.'
            }), 400);
        }

        const parsedLogicalBucketName = R2BucketNameSchema.safeParse(bucketNameInput);
        if (!parsedLogicalBucketName.success) {
            return c.json(BucketNotFoundErrorSchema.parse({
                success: false,
                message: `Invalid bucket name format: ${parsedLogicalBucketName.error.message}`,
                bucketNameAttempted: bucketNameInput
            }), 400);
        }
        const logicalBucketName = parsedLogicalBucketName.data;

        const s3Details = getS3BucketDetails(c, logicalBucketName);
        if (!s3Details) {
            return c.json(BucketNotFoundErrorSchema.parse({
                success: false,
                message: 'Bucket not found or not configured.', // Ensure this matches the literal in BucketNotFoundErrorSchema
                bucketNameAttempted: logicalBucketName
            }), 500);
        }
        const { s3Client, bucketName: actualBucketName } = s3Details;

        let objectKey: string;
        if (typeof keyInput === 'string' && keyInput.trim() !== '') {
            objectKey = sanitizeKey(keyInput.trim());
            if (!objectKey) {
                 return c.json(InvalidKeyErrorSchema.parse({
                    success: false,
                    message: 'Provided object key is invalid after sanitization.'
                }), 400);
            }
        } else {
            const fileExtension = file.name.includes('.') ? `.${file.name.split('.').pop()}` : '';
            objectKey = `${uuidv4()}${fileExtension}`;
        }

        if (new TextEncoder().encode(objectKey).length === 0 || new TextEncoder().encode(objectKey).length > 1024) {
             return c.json(InvalidKeyErrorSchema.parse({
                success: false,
                message: 'Object key is empty or exceeds the maximum length of 1024 bytes.'
            }), 400);
        }

        const contentType = (typeof contentTypeInput === 'string' && contentTypeInput.trim() !== '') ? contentTypeInput.trim() : file.type;
        if (!contentType) {
            return c.json(MissingContentTypeErrorSchema.parse({
                success: false,
                message: 'Content type for the file could not be determined and was not provided.'
            }), 400);
        }

        let s3Metadata: Record<string, string> | undefined = undefined;
        if (typeof customMetadataInput === 'string' && customMetadataInput.trim() !== '') {
            try {
                const parsedMeta = JSON.parse(customMetadataInput);
                if (typeof parsedMeta === 'object' && parsedMeta !== null && !Array.isArray(parsedMeta)) {
                    s3Metadata = {};
                    for (const k in parsedMeta) {
                        if (Object.prototype.hasOwnProperty.call(parsedMeta, k)) {
                            const value = String(parsedMeta[k]);
                            // Basic check for non-ASCII characters for S3 metadata compatibility
                            if (!/^[^\x00-\x1F\x7F-\xFF]*$/.test(value) || !/^[^\x00-\x1F\x7F-\xFF]*$/.test(k)) {
                                 console.warn(`Metadata key '${k}' or its value may contain characters not strictly ASCII or suitable for HTTP headers. Ensure compatibility.`);
                            }
                            s3Metadata[k.toLowerCase()] = value; // S3 metadata keys are often normalized to lowercase
                        }
                    }
                } else {
                    throw new Error('Parsed custom metadata is not a JSON object.');
                }
            } catch (e: any) {
                return c.json(InvalidCustomMetadataErrorSchema.parse({
                    success: false,
                    message: e.message || 'Custom metadata is not a valid JSON object string.'
                }), 400);
            }
        }

        // Buffer the file into memory
        const fileArrayBuffer = await file.arrayBuffer();

        const putObjectCommand = new PutObjectCommand({
            Bucket: actualBucketName,
            Key: objectKey,
            Body: new Uint8Array(fileArrayBuffer), // Convert ArrayBuffer to Uint8Array
            ContentLength: file.size, // file.size should match fileArrayBuffer.byteLength
            ContentType: contentType,
            Metadata: s3Metadata,
        });

        await s3Client.send(putObjectCommand);

        return c.json(UploadObjectSuccessResponseSchema.parse({
            success: true,
            message: 'File uploaded successfully.',
            objectKey: objectKey,
            bucket: logicalBucketName, // Return the logical name as per schema
            // url: Optional: Construct public URL if applicable and domain is known
        }), 201);

    } catch (error: any) {
        console.error('Upload error:', error);
        if (error instanceof z.ZodError) {
            return c.json({ 
                success: false,
                message: 'Invalid request data due to Zod validation.',
                errors: error.flatten().fieldErrors
            }, 400);
        }
        return c.json(R2OperationErrorSchema.parse({
            success: false,
            message: 'An unexpected error occurred during file upload.',
            details: error.message || 'Unknown S3 operation error.'
        }), 500);
    }
}; 
