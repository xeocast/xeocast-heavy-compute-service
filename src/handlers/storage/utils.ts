// src/handlers/storage/utils.ts
import { z } from 'zod';
import { R2BucketNameSchema } from '../../schemas/storageSchemas.js';
import { S3Client } from '@aws-sdk/client-s3';

// Define a type for the Hono context environment variables
// This should align with what's in .env.example and Cloudflare bindings
interface EnvVars {
    R2_ENDPOINT_URL: string;
    R2_RW_ACCESS_KEY_ID: string;
    R2_RW_SECRET_ACCESS_KEY: string;
    R2_EPISODE_PROJECTS_BUCKET: string; // Actual bucket name, e.g., "episode-projects"
    R2_DEFAULT_FILES_BUCKET: string;   // Actual bucket name, e.g., "default-files"
    [key: string]: any; // Allow other env vars
}

export interface S3BucketDetails {
    s3Client: S3Client;
    bucketName: string; // The actual bucket name to use with S3 commands
}

export function getS3BucketDetails(c: { env: EnvVars }, logicalBucketName: z.infer<typeof R2BucketNameSchema>): S3BucketDetails | null {
    const {
        R2_ENDPOINT_URL,
        R2_RW_ACCESS_KEY_ID,
        R2_RW_SECRET_ACCESS_KEY,
        R2_EPISODE_PROJECTS_BUCKET,
        R2_DEFAULT_FILES_BUCKET,
    } = process.env;

    if (!R2_ENDPOINT_URL || !R2_RW_ACCESS_KEY_ID || !R2_RW_SECRET_ACCESS_KEY) {
        console.error('Missing R2 S3-compatible API credentials or endpoint URL in environment variables.');
        return null;
    }

    const s3Client = new S3Client({
        region: 'auto', // R2 typically uses 'auto' for region
        endpoint: R2_ENDPOINT_URL,
        credentials: {
            accessKeyId: R2_RW_ACCESS_KEY_ID,
            secretAccessKey: R2_RW_SECRET_ACCESS_KEY,
        },
    });

    let actualBucketName: string;

    switch (logicalBucketName) {
        case 'EPISODE_PROJECTS_BUCKET':
            actualBucketName = R2_EPISODE_PROJECTS_BUCKET!;
            break;
        case 'DEFAULT_FILES_BUCKET':
            actualBucketName = R2_DEFAULT_FILES_BUCKET!;
            break;
        default:
            // This case should ideally be prevented by schema validation if R2BucketNameSchema is an enum.
            console.error(`Unrecognized R2 bucket logical name: ${logicalBucketName}`);
            return null;
    }
    
    if (!actualBucketName) {
        console.error(`Actual bucket name for logical name '${logicalBucketName}' is not defined in environment variables.`);
        return null;
    }

    return { s3Client, bucketName: actualBucketName };
}

// Add other shared utility functions for storage handlers here if needed

