import { z } from 'zod';
import type { Context } from 'hono';
import type { RouteConfigToTypedResponse } from '@hono/zod-openapi';
import {
  MultiSpeakerSpeechRequestSchema,
  type InferredMultiSpeakerSpeechRequest,
  // GenerateMultiSpeakerSpeechResponseSchema is used for the task's result structure
} from '../../schemas/ai.schemas.js';
import { GoogleGenAI } from '@google/genai';
import { createTask, updateTask } from '../../services/task.service.js';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { Writer } from 'wav';
import { type Part, type GenerationConfig, Modality } from '@google/genai'; // Added Modality
import { generateMultiSpeakerSpeechRoute } from '../../routes/ai.routes.js';

// R2 Client (initialized later if credentials are valid)
let r2Client: S3Client | undefined;

const initializeR2Client = () => {
  if (r2Client) return r2Client;

  const { R2_ENDPOINT_URL, R2_RW_ACCESS_KEY_ID, R2_RW_SECRET_ACCESS_KEY } = process.env;

  if (!R2_ENDPOINT_URL || !R2_RW_ACCESS_KEY_ID || !R2_RW_SECRET_ACCESS_KEY) {
    console.error('R2 client environment variables (R2_ENDPOINT_URL, R2_RW_ACCESS_KEY_ID, R2_RW_SECRET_ACCESS_KEY) are not fully configured.');
    return undefined;
  }

  r2Client = new S3Client({
    region: 'auto',
    endpoint: R2_ENDPOINT_URL,
    credentials: {
      accessKeyId: R2_RW_ACCESS_KEY_ID,
      secretAccessKey: R2_RW_SECRET_ACCESS_KEY,
    },
  });
  return r2Client;
};

export const generateMultiSpeakerSpeechHandler = async (
  c: Context<
    { Variables: {} },
    typeof generateMultiSpeakerSpeechRoute.path,
    { out: { json: InferredMultiSpeakerSpeechRequest } }
  >
): Promise<RouteConfigToTypedResponse<typeof generateMultiSpeakerSpeechRoute>> => {
  const validatedBody = (c.req as any).valid('json') as z.infer<typeof MultiSpeakerSpeechRequestSchema>;

  if (!validatedBody) {
    return c.json({ error: 'Invalid request body' }, 400) as any;
  }

  const { script, model: requestedModel, output_bucket_key } = validatedBody;

  const taskId = createTask({ script, model: requestedModel, type: 'audioGeneration' });

  c.res = c.json({ taskId: taskId, message: "Audio generation task created and processing started." }, 202);

  const processAndCompleteTask = async () => {
    try {
      updateTask(taskId, 'PROCESSING');

      if (output_bucket_key) {
        console.log(`Task ${taskId}: Received output_bucket_key: ${output_bucket_key}`);
      } else {
        console.log(`Task ${taskId}: output_bucket_key not provided.`);
      }

      const r2 = initializeR2Client();
      const r2BucketName = process.env.R2_EPISODE_PROJECTS_BUCKET;

      if (!r2 || !r2BucketName) {
        const errorMessage = !r2 ? 'R2 client failed to initialize. Check R2 environment variables.' : 'R2_EPISODE_PROJECTS_BUCKET environment variable is not set.';
        console.error(`Task ${taskId}: ${errorMessage}`);
        updateTask(taskId, 'FAILED', { error: { message: errorMessage } });
        return;
      }

      if (!process.env.GEMINI_API_KEY) {
        console.error(`Task ${taskId}: GEMINI_API_KEY is not configured.`);
        updateTask(taskId, 'FAILED', { error: { message: 'GEMINI_API_KEY is not configured' } });
        return;
      }

      const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const aiModelName = requestedModel || "gemini-2.5-flash-preview-tts"; // Default TTS model

      const contents = [{ role: "user", parts: [{ text: script }] }];

      // Adapted from example: using specific speechConfig for multi-speaker
      const generationConfig: GenerationConfig = {
        responseModalities: [Modality.AUDIO], // Used Modality enum
        // IMPORTANT: The script should be formatted for these speakers (Joe, Jane)
        // for this config to be effective.
        speechConfig: {
          multiSpeakerVoiceConfig: {
            speakerVoiceConfigs: [
              {
                speaker: 'Alex',
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: 'charon' } 
                }
              },
              {
                speaker: 'Emma',
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: 'callirrhoe' } 
                }
              }
            ]
          }
        }
      };

      // Reverted to use genAI.models.generateContent and pass generationConfig via 'config' property
      const result = await genAI.models.generateContent({
        model: aiModelName, // Model name passed here
        contents,
        config: generationConfig, // generationConfig passed inside 'config' property
      });

      let audioPart: Part | undefined;
      const firstCandidate = result.candidates?.[0];
      if (firstCandidate?.content?.parts && Array.isArray(firstCandidate.content.parts)) {
        audioPart = firstCandidate.content.parts.find(
          (part: Part) => part.inlineData?.data && typeof part.inlineData?.mimeType === 'string' && part.inlineData.mimeType.startsWith('audio/')
        );
      }

      if (!audioPart || !audioPart.inlineData || !audioPart.inlineData.data) { // Added check for inlineData.data
        console.error(`Task ${taskId}: No audio data received from Gemini.`);
        updateTask(taskId, 'FAILED', { error: { message: 'No audio data received from Gemini.' } });
        return;
      }

      // const inlineData = audioPart.inlineData;
      const audioDataB64 = audioPart.inlineData.data;
      const originalMimeTypeFromApi = audioPart.inlineData.mimeType;
      console.log(`Task ${taskId}: Original MIME type from Gemini API: ${originalMimeTypeFromApi}`);

      const rawPcmBuffer = Buffer.from(audioDataB64, 'base64');
      console.log(`Task ${taskId}: Decoded base64 audio data. Raw PCM buffer size: ${rawPcmBuffer.length}`);

      // Convert raw PCM to WAV format. The result will be named 'audioBuffer' to match subsequent code.
      const audioBuffer = await new Promise<Buffer>((resolve, reject) => {
        try {
          const writer = new Writer({
            sampleRate: 24000, // Based on Gemini TTS output: 24kHz
            channels: 1,       // Assuming mono for TTS
            bitDepth: 16,      // Assuming 16-bit PCM
          });

          const chunks: Buffer[] = [];
          writer.on('data', (chunk) => {
            chunks.push(chunk);
          });
          writer.on('end', () => {
            resolve(Buffer.concat(chunks));
          });
          writer.on('error', (err: Error) => {
            console.error(`Task ${taskId}: Error during WAV encoding: ${err.message}`, err);
            reject(new Error(`Failed to encode audio to WAV: ${err.message}`));
          });

          writer.write(rawPcmBuffer);
          writer.end();
        } catch (err: any) {
          console.error(`Task ${taskId}: Synchronous exception during WAV writer setup: ${err.message}`, err);
          reject(new Error(`Synchronous exception during WAV writer setup: ${err.message}`));
        }
      });
      
      console.log(`Task ${taskId}: Successfully encoded audio to WAV format. Final WAV buffer size: ${audioBuffer.length}`);

      // Warn if the original MIME type doesn't look like raw PCM, as our WAV encoding assumes it is.
      if (originalMimeTypeFromApi && !originalMimeTypeFromApi.toLowerCase().includes('pcm') && !originalMimeTypeFromApi.toLowerCase().includes('raw') && !originalMimeTypeFromApi.toLowerCase().includes('l16')) {
        console.warn(`Task ${taskId}: Original MIME type from Gemini was '${originalMimeTypeFromApi}'. We assumed this was raw PCM data and encoded it to WAV. If audio playback fails or is distorted, the original data might not have been compatible raw PCM.`);
      }
      
      const mimeType = 'audio/wav'; // This is now accurate as we've encoded to WAV
      const extension = 'wav';     // Consistent with WAV format
      
      // Subsequent code will use 'audioBuffer' which now holds the WAV formatted data.

      let finalBucketKey = output_bucket_key;
      if (finalBucketKey) {
        finalBucketKey = finalBucketKey.replace('{extension}', extension);
      } else {
        finalBucketKey = `${taskId}.${extension}`;
      }
      
      console.log(`Task ${taskId}: Uploading audio to R2. Bucket: ${r2BucketName}, Key: ${finalBucketKey}, MimeType: ${mimeType}`);

      const putObjectCommand = new PutObjectCommand({
        Bucket: r2BucketName,
        Key: finalBucketKey,
        Body: audioBuffer,
        ContentType: mimeType,
      });

      await r2.send(putObjectCommand);
      console.log(`Task ${taskId}: Audio successfully uploaded to R2. Key: ${finalBucketKey}`);

      const resultPayload = {
        bucketKey: finalBucketKey,
        mimeType: mimeType,
        status: 'success',
      };
      updateTask(taskId, 'COMPLETED', { result: resultPayload });

    } catch (error: any) {
      console.error(`Task ${taskId}: Error during audio generation: ${error.message}`, error);
      updateTask(taskId, 'FAILED', {
        error: {
          message: error.message || 'Unknown error during audio generation',
          details: error.stack || error.toString(),
        },
      });
    }
  };

  let ranWithWaitUntil = false;
  try {
    if (c.executionCtx && typeof c.executionCtx.waitUntil === 'function') {
      c.executionCtx.waitUntil(processAndCompleteTask());
      ranWithWaitUntil = true;
    }
  } catch {
    // console.info('c.executionCtx.waitUntil is not available. Proceeding with standard async execution.');
  }

  if (!ranWithWaitUntil) {
    processAndCompleteTask().catch(err => {
      console.error(`Task ${taskId}: Unhandled error in background task execution:`, err);
      updateTask(taskId, 'FAILED', {
        error: {
          message: 'Unhandled exception in background processing.',
          details: err.stack || err.toString(),
        },
      });
    });
  }
  
  return c.res as any;
};
