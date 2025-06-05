import { z } from 'zod';
import type { Context } from 'hono';
import type { RouteConfigToTypedResponse } from '@hono/zod-openapi';
import {
  generateEpisodeAudioRoute,
  GenerateEpisodeAudioRequestSchema,
  type InferredGenerateEpisodeAudioRequest,
  // GenerateEpisodeAudioResponseSchema is used for the task's result structure
} from '../../schemas/geminiSchemas';
import { GoogleGenAI } from '@google/genai';
import { createTask, updateTask } from '../../services/taskService';
import { writeFile, mkdir } from 'fs/promises';
import * as path from 'path';
import { FileWriter } from 'wav'; // Added for saving WAV files
// import mime from 'mime'; // No longer needed as we're saving as WAV
import { type Part, type GenerationConfig, Modality } from '@google/genai'; // Added Modality

// Ensure your Hono server is configured to serve static files from 'public' directory
// e.g., app.use('/static/*', serveStatic({ root: './public' }))
// Then the audioUrl can be something like /static/audio/taskId.mp3
const AUDIO_PUBLIC_PATH = '/audio'; // Relative path for the URL
const AUDIO_SAVE_DIR = path.join(process.cwd(), 'public', 'audio'); // Absolute path for saving files

// Utility function to save PCM data as a WAV file (adapted from example)
async function saveWaveFile(
  filename: string,
  pcmData: Buffer,
  channels = 1,
  sampleRate = 24000, // Default from example, ensure Gemini output matches
  bitDepth = 16      // Default from example (sampleWidth = 2 bytes * 8 = 16 bits)
): Promise<void> {
  return new Promise((resolve, reject) => {
    const writer = new FileWriter(filename, {
      channels,
      sampleRate,
      bitDepth,
    });

    writer.on('finish', resolve);
    writer.on('error', reject);

    writer.write(pcmData);
    writer.end();
  });
}

export const generateEpisodeAudioHandler = async (
  c: Context<
    { Variables: {} },
    typeof generateEpisodeAudioRoute.path,
    { out: { json: InferredGenerateEpisodeAudioRequest } }
  >
): Promise<RouteConfigToTypedResponse<typeof generateEpisodeAudioRoute>> => {
  const validatedBody = (c.req as any).valid('json') as z.infer<typeof GenerateEpisodeAudioRequestSchema>;

  if (!validatedBody) {
    return c.json({ error: 'Invalid request body' }, 400) as any;
  }

  const { script, model: requestedModel } = validatedBody;

  const taskId = createTask({ script, model: requestedModel, type: 'audioGeneration' });

  c.res = c.json({ taskId: taskId, message: "Audio generation task created and processing started." }, 202);

  const processAndCompleteTask = async () => {
    try {
      updateTask(taskId, 'PROCESSING');

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
                speaker: 'Charon',
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: 'Kore' } 
                }
              },
              {
                speaker: 'Callirhoe',
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: 'Puck' } 
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

      const inlineData = audioPart.inlineData; // inlineData is guaranteed by the check above
      const data = audioPart.inlineData.data; // data is also guaranteed to be a string
      
      const fileExtension = 'wav'; // Hardcoding to wav as per example
      const audioBuffer = Buffer.from(data, 'base64');

      await mkdir(AUDIO_SAVE_DIR, { recursive: true });
      const audioFileName = `${taskId}.${fileExtension}`;
      const audioFilePath = path.join(AUDIO_SAVE_DIR, audioFileName);

      // Use saveWaveFile utility (assuming default params match Gemini output)
      await saveWaveFile(audioFilePath, audioBuffer);
      console.log(`Task ${taskId}: Audio saved to ${audioFilePath}`);

      const serverBaseUrl = process.env.SERVER_BASE_URL || '';
      const audioUrl = `${serverBaseUrl}${AUDIO_PUBLIC_PATH}/${audioFileName}`;

      const resultPayload = {
        audioUrl: audioUrl,
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
  } catch (e) {
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
