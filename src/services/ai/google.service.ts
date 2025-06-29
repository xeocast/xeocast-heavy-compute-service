import { GoogleGenAI, Type } from '@google/genai';
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
