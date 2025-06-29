import { GoogleGenAI, Type, Part, GenerationConfig, Modality } from '@google/genai';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { Writer } from 'wav';
import { z } from 'zod';
import { SingleSpeakerSpeechResponseSchema } from '../../schemas/ai.schemas.js';

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

export const generateSingleSpeakerAudio = async (
  text: string,
  model: string | undefined,
  output_bucket_key: string | undefined,
  taskId: string
): Promise<z.infer<typeof SingleSpeakerSpeechResponseSchema>> => {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured.');
  }

  const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const aiModelName = model || "gemini-2.5-flash-preview-tts"; // Default TTS model

  const contents = [{ role: "user", parts: [{ text: text }] }];

  const generationConfig: GenerationConfig = {
    responseModalities: [Modality.AUDIO],
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

  if (!audioPart || !audioPart.inlineData || !audioPart.inlineData.data) {
    throw new Error('No audio data received from Gemini.');
  }

  const audioDataB64 = audioPart.inlineData.data;
  const originalMimeTypeFromApi = audioPart.inlineData.mimeType;
  console.log(`Task ${taskId}: Original MIME type from Gemini API: ${originalMimeTypeFromApi}`);

  const rawPcmBuffer = Buffer.from(audioDataB64, 'base64');
  console.log(`Task ${taskId}: Decoded base64 audio data. Raw PCM buffer size: ${rawPcmBuffer.length}`);

  const audioBuffer = await new Promise<Buffer>((resolve, reject) => {
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
  
  console.log(`Task ${taskId}: Successfully encoded audio to WAV format. Final WAV buffer size: ${audioBuffer.length}`);

  if (originalMimeTypeFromApi && !originalMimeTypeFromApi.toLowerCase().includes('pcm') && !originalMimeTypeFromApi.toLowerCase().includes('raw') && !originalMimeTypeFromApi.toLowerCase().includes('l16')) {
    console.warn(`Task ${taskId}: Original MIME type from Gemini was '${originalMimeTypeFromApi}'. We assumed this was raw PCM data and encoded it to WAV. If audio playback fails or is distorted, the original data might not have been compatible raw PCM.`);
  }
  
  const mimeType = 'audio/wav';
  const extension = 'wav';
  
  let finalBucketKey = output_bucket_key;
  if (finalBucketKey) {
    finalBucketKey = finalBucketKey.replace('{extension}', extension);
  } else {
    finalBucketKey = `${taskId}.${extension}`;
  }
  
  console.log(`Task ${taskId}: Uploading audio to R2. Bucket: ${process.env.R2_EPISODE_PROJECTS_BUCKET}, Key: ${finalBucketKey}, MimeType: ${mimeType}`);

  const r2 = initializeR2Client();
  const r2BucketName = process.env.R2_EPISODE_PROJECTS_BUCKET;

  if (!r2 || !r2BucketName) {
    throw new Error(!r2 ? 'R2 client failed to initialize. Check R2 environment variables.' : 'R2_EPISODE_PROJECTS_BUCKET environment variable is not set.');
  }

  const putObjectCommand = new PutObjectCommand({
    Bucket: r2BucketName,
    Key: finalBucketKey,
    Body: audioBuffer,
    ContentType: mimeType,
  });

  await r2.send(putObjectCommand);
  console.log(`Task ${taskId}: Audio successfully uploaded to R2. Key: ${finalBucketKey}`);

  return {
    bucketKey: finalBucketKey,
    mimeType: mimeType,
    status: 'success',
  };
};
import { updateTask } from '../task.service.js';

export async function generateStructuredScriptWithGemini(taskId: string, prompt: string, article: string, requestedModel?: string) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      console.error(`Task ${taskId}: GEMINI_API_KEY is not configured.`);
      updateTask(taskId, 'FAILED', { error: { message: 'GEMINI_API_KEY is not configured' } });
      return;
    }

    const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const aiModelName = requestedModel || "gemini-2.5-flash-preview-05-20";

    const fullPromptText = (str: string) =>
      str.replace(/\{ ?articleContent ?\}/g, article);

    const aiResponse = await genAI.models.generateContent({
      model: aiModelName,
      contents: [
        { role: "user", parts: [{ text: fullPromptText(prompt) }] }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              speaker: {
                type: Type.STRING,
              },
              line: {
                type: Type.STRING,
              }
            },
            required: ['speaker', 'line'],
            propertyOrdering: ['speaker', 'line'],
          },
        },
      },
    });

    const metaJsonString = aiResponse.text;

    if (metaJsonString == null) {
      console.error(`Task ${taskId}: Failed to generate content from Gemini. JSON string is null or undefined.`);
      updateTask(taskId, 'FAILED', { error: { message: 'Failed to generate content - JSON string is null or undefined' } });
      return;
    }

    let parsedResult;
    try {
      parsedResult = JSON.parse(metaJsonString);
    } catch (e: any) {
      console.error(`Task ${taskId}: Generated script is not valid JSON: ${metaJsonString}`, e);
      updateTask(taskId, 'FAILED', { error: { message: 'Generated script is not valid JSON', details: e.message } });
      return;
    }

    const resultPayload = {
      result: parsedResult,
      status: 'success',
    };
    updateTask(taskId, 'COMPLETED', { result: resultPayload });

  } catch (error: any) {
    console.error(`Task ${taskId}: Error during episode script generation: ${error.message}`, error);
    updateTask(taskId, 'FAILED', {
      error: {
        message: error.message || 'Unknown error during episode script generation',
        details: error.stack || error.toString(),
      },
    });
  }
}

export async function generateStructuredMetadataWithGemini(taskId: string, prompt: string, article: string, requestedModel?: string) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      console.error(`Task ${taskId}: GEMINI_API_KEY is not configured.`);
      updateTask(taskId, 'FAILED', { error: { message: 'GEMINI_API_KEY is not configured' } });
      return;
    }

    const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const aiModelName = requestedModel || "gemini-2.5-flash-preview-05-20";

    const fullPrompt = (str: string) =>
      str.replace(/\{ ?articleContent ?\}/g, article);

    const aiResponse = await genAI.models.generateContent({
      model: aiModelName,
      contents: [
        { role: "user", parts: [{ text: fullPrompt(prompt) }] }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            description: {
              type: Type.STRING,
            },
            tags: {
              type: Type.ARRAY,
              items: {
                type: Type.STRING,
              },
            },
            thumbnailPrompt: {
              type: Type.STRING,
            },
            articleImagePrompt: {
              type: Type.STRING,
            },
          },
          propertyOrdering: ["description", "tags", "thumbnailPrompt", "articleImagePrompt"],
        },
      },
    });

    const metaJsonString = aiResponse.text;

    if (!metaJsonString) {
      console.error(`Task ${taskId}: Failed to generate content from Gemini. JSON string is null or undefined.`);
      updateTask(taskId, 'FAILED', { error: { message: 'Failed to generate content - JSON string is null or undefined' } });
      return;
    }

    let parsedResult;
    try {
      parsedResult = JSON.parse(metaJsonString);
    } catch (e: any) {
      console.error(`Task ${taskId}: Generated metadata is not valid JSON: ${metaJsonString}`, e);
      updateTask(taskId, 'FAILED', { error: { message: 'Generated metadata is not valid JSON', details: e.message } });
      return;
    }

    const resultPayload = {
      result: parsedResult,
      status: 'success',
    };
    updateTask(taskId, 'COMPLETED', { result: resultPayload });

  } catch (error: any) {
    console.error(`Task ${taskId}: Error during metadata generation: ${error.message}`, error);
    updateTask(taskId, 'FAILED', {
      error: {
        message: error.message || 'Unknown error during metadata generation',
        details: error.stack || error.toString(),
      },
    });
  }
}

export async function generateTextWithGemini(taskId: string, prompt: string, requestedModel?: string) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      console.error(`Task ${taskId}: GEMINI_API_KEY is not configured.`);
      updateTask(taskId, 'FAILED', { error: { message: 'GEMINI_API_KEY is not configured' } });
      return;
    }

    const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const aiModelName = requestedModel || "gemini-2.5-flash-preview-05-20";

    const aiResponse = await genAI.models.generateContent({
      model: aiModelName,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });

    const generatedText = aiResponse.text;

    if (generatedText == null) {
      console.error(`Task ${taskId}: Failed to generate content from Gemini. Text is null or undefined.`);
      updateTask(taskId, 'FAILED', { error: { message: 'Failed to generate content - text is null or undefined' } });
      return;
    }

    const resultPayload = {
      generatedText: generatedText,
      status: 'success',
    };
    updateTask(taskId, 'COMPLETED', { result: resultPayload });

  } catch (error: any) {
    console.error(`Task ${taskId}: Error during Gemini text generation: ${error.message}`, error);
    updateTask(taskId, 'FAILED', { error: { message: error.message || 'Unknown error during text generation', details: error.stack || error.toString() } });
  }
}

export async function generateImageWithGemini(taskId: string, prompt: string, requestedModel?: string) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      console.error(`Task ${taskId}: GEMINI_API_KEY is not configured.`);
      updateTask(taskId, 'FAILED', { error: { message: 'GEMINI_API_KEY is not configured' } });
      return;
    }

    console.log(prompt, requestedModel)

    // const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    // const aiModelName = requestedModel || "gemini-2.5-flash-preview-05-20";

    // Placeholder for actual image generation logic
    // In a real scenario, this would call a specific image generation model
    // and return a URL to the generated image.
    const imageUrl = `https://example.com/generated-image-${taskId}.png`;

    const resultPayload = {
      imageUrl: imageUrl,
      status: 'success',
    };
    updateTask(taskId, 'COMPLETED', { result: resultPayload });

  } catch (error: any) {
    console.error(`Task ${taskId}: Error during Gemini image generation: ${error.message}`, error);
    updateTask(taskId, 'FAILED', { error: { message: error.message || 'Unknown error during image generation', details: error.stack || error.toString() } });
  }
}

export async function generateStructuredTitlesWithGemini(taskId: string, prompt: string, requestedModel?: string) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      console.error(`Task ${taskId}: GEMINI_API_KEY is not configured.`);
      updateTask(taskId, 'FAILED', { error: { message: 'GEMINI_API_KEY is not configured' } });
      return;
    }

    const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const aiModelName = requestedModel || "gemini-2.5-flash-preview-05-20";

    const aiResponse = await genAI.models.generateContent({
      model: aiModelName,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: {
                type: Type.STRING,
              },
              description: {
                type: Type.STRING,
              },
            },
            required: ['title', 'description'],
            propertyOrdering: ['title', 'description'],
          },
        },
      },
    });

    const metaJsonString = aiResponse.text;

    if (!metaJsonString) {
      console.error(`Task ${taskId}: Failed to generate content from Gemini. JSON string is null or undefined.`);
      updateTask(taskId, 'FAILED', { error: { message: 'Failed to generate content - JSON string is null or undefined' } });
      return;
    }

    let parsedResult;
    try {
      parsedResult = JSON.parse(metaJsonString);
    } catch (e: any) {
      console.error(`Task ${taskId}: Generated titles are not valid JSON: ${metaJsonString}`, e);
      updateTask(taskId, 'FAILED', { error: { message: 'Generated titles are not valid JSON', details: e.message } });
      return;
    }

    const resultPayload = {
      result: parsedResult,
      status: 'success',
    };
    updateTask(taskId, 'COMPLETED', { result: resultPayload });

  } catch (error: any) {
    console.error(`Task ${taskId}: Error during structured titles generation: ${error.message}`, error);
    updateTask(taskId, 'FAILED', { error: { message: error.message || 'Unknown error during structured titles generation', details: error.stack || error.toString() } });
  }
}

export async function generateVideoWithGemini(taskId: string, prompt: string, requestedModel?: string) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      console.error(`Task ${taskId}: GEMINI_API_KEY is not configured.`);
      updateTask(taskId, 'FAILED', { error: { message: 'GEMINI_API_KEY is not configured' } });
      return;
    }

    console.log(`Task ${taskId}: Generating video with Gemini for prompt: ${prompt}, model: ${requestedModel}`);

    // Placeholder for actual video generation logic
    // In a real scenario, this would call a specific video generation model
    // and return a URL to the generated video.
    const videoUrl = `https://example.com/generated-video-${taskId}.mp4`;

    const resultPayload = {
      videoUrl: videoUrl,
      status: 'success',
    };
    updateTask(taskId, 'COMPLETED', { result: resultPayload });

  } catch (error: any) {
    console.error(`Task ${taskId}: Error during Gemini video generation: ${error.message}`, error);
    updateTask(taskId, 'FAILED', { error: { message: error.message || 'Unknown error during video generation', details: error.stack || error.toString() } });
  }
}

export async function generateMusicWithGoogle(taskId: string, prompt: string, requestedModel?: string) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      console.error(`Task ${taskId}: GEMINI_API_KEY is not configured.`);
      updateTask(taskId, 'FAILED', { error: { message: 'GEMINI_API_KEY is not configured' } });
      return;
    }

    console.log(`Task ${taskId}: Generating music with Google for prompt: ${prompt}, model: ${requestedModel}`);

    // Placeholder for actual music generation logic
    // In a real scenario, this would call a specific music generation model
    // and return a URL to the generated audio.
    const audioUrl = `https://example.com/generated-music-${taskId}.mp3`;

    const resultPayload = {
      audioUrl: audioUrl,
      status: 'success',
    };
    updateTask(taskId, 'COMPLETED', { result: resultPayload });

  } catch (error: any) {
    console.error(`Task ${taskId}: Error during Google music generation: ${error.message}`, error);
    updateTask(taskId, 'FAILED', { error: { message: error.message || 'Unknown error during music generation', details: error.stack || error.toString() } });
  }
}
