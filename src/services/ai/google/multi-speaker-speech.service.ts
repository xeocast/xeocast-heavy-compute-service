import { GoogleGenAI, Part, GenerationConfig, Modality } from '@google/genai';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { Writer } from 'wav';
import * as z from 'zod';
import { SingleSpeakerSpeechResponseSchema, MultiSpeakerSpeechResponseSchema } from '../../../schemas/ai.schemas.js';

// R2 Client (initialized later if credentials are valid)
let r2Client: S3Client | undefined;
const initializeR2Client = (): S3Client | undefined => {
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

const encodePcmToWav = (rawPcmBuffer: Buffer, taskId: string): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    try {
      const writer = new Writer({
        sampleRate: 24000,
        channels: 1,
        bitDepth: 16,
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
};

const uploadAudioToR2 = async (audioBuffer: Buffer, finalBucketKey: string, mimeType: string, taskId: string) => {
  const r2 = initializeR2Client();
  const r2BucketName = process.env.R2_EPISODE_PROJECTS_BUCKET;

  if (!r2 || !r2BucketName) {
    throw new Error(!r2 ? 'R2 client failed to initialize. Check R2 environment variables.' : 'R2_EPISODE_PROJECTS_BUCKET environment variable is not set.');
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
};

const processAudioData = async (audioPart: Part, taskId: string): Promise<{ audioBuffer: Buffer; mimeType: string; extension: string }> => {
  // Ensure inlineData and data exist before accessing
  if (!audioPart.inlineData || !audioPart.inlineData.data) {
    throw new Error('Invalid audioPart: inlineData or data is missing.');
  }

  const audioDataB64 = audioPart.inlineData.data;
  const originalMimeTypeFromApi = audioPart.inlineData.mimeType;
  console.log(`Task ${taskId}: Original MIME type from Gemini API: ${originalMimeTypeFromApi}`);

  const rawPcmBuffer = Buffer.from(audioDataB64, 'base64');
  console.log(`Task ${taskId}: Decoded base64 audio data. Raw PCM buffer size: ${rawPcmBuffer.length}`);

  const audioBuffer = await encodePcmToWav(rawPcmBuffer, taskId);

  console.log(`Task ${taskId}: Successfully encoded audio to WAV format. Final WAV buffer size: ${audioBuffer.length}`);

  if (originalMimeTypeFromApi && !originalMimeTypeFromApi.toLowerCase().includes('pcm') && !originalMimeTypeFromApi.toLowerCase().includes('raw') && !originalMimeTypeFromApi.toLowerCase().includes('l16')) {
    console.warn(`Task ${taskId}: Original MIME type from Gemini was '${originalMimeTypeFromApi}'. We assumed this was raw PCM data and encoded it to WAV. If audio playback fails or is distorted, the original data might not have been compatible raw PCM.`);
  }

  const mimeType = 'audio/wav';
  const extension = 'wav';

  return { audioBuffer, mimeType, extension };
};

const uploadAudioAndReturnResponse = async (
  audioPart: Part,
  output_bucket_key: string | undefined,
  taskId: string,
  _ResponseSchema: typeof SingleSpeakerSpeechResponseSchema | typeof MultiSpeakerSpeechResponseSchema
): Promise<z.infer<typeof SingleSpeakerSpeechResponseSchema | typeof MultiSpeakerSpeechResponseSchema>> => {
  const { audioBuffer, mimeType, extension } = await processAudioData(audioPart, taskId);

  let finalBucketKey = output_bucket_key;
  if (finalBucketKey) {
    finalBucketKey = finalBucketKey.replace('{extension}', extension);
  } else {
    finalBucketKey = `${taskId}.${extension}`;
  }

  await uploadAudioToR2(audioBuffer, finalBucketKey, mimeType, taskId);

  return {
    bucketKey: finalBucketKey,
    mimeType: mimeType,
    status: 'success',
  };
};

export const generateMultiSpeakerAudioWithGemini = async (
  script: string,
  model: string | undefined,
  output_bucket_key: string | undefined,
  taskId: string
): Promise<z.infer<typeof MultiSpeakerSpeechResponseSchema>> => {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured.');
  }

  const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const aiModelName = model || "gemini-2.5-flash-preview-tts"; // Default TTS model

  const contents = [{ role: "user", parts: [{ text: script }] }];

  const generationConfig: GenerationConfig = {
    responseModalities: [Modality.AUDIO],
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

  const result = await genAI.models.generateContent({
    model: aiModelName,
    contents,
    config: generationConfig,
  });

  let audioPart: Part | undefined;
  const firstCandidate = result.candidates?.[0];
  if (firstCandidate?.content?.parts && Array.isArray(firstCandidate.content.parts)) {
    audioPart = firstCandidate.content.parts.find(
      (part: Part) => part.inlineData?.data && typeof part.inlineData?.mimeType === 'string' && part.inlineData.mimeType.startsWith('audio/')
    );
  }

  if (!audioPart) {
    throw new Error('No audio data received from Gemini.');
  }

  return uploadAudioAndReturnResponse(audioPart, output_bucket_key, taskId, MultiSpeakerSpeechResponseSchema);
};
