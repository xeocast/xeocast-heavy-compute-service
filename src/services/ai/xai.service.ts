import { updateTask } from '../task.service.js';

export async function generateTextWithGrok(taskId: string, _prompt: string, _requestedModel?: string) {
    updateTask(taskId, 'FAILED', { error: { message: 'Grok provider not yet implemented' } });
}

export async function generateStructuredScriptWithGrok(taskId: string, _prompt: string, _article: string, _requestedModel?: string) {
    updateTask(taskId, 'FAILED', { error: { message: 'Structured script generation not yet implemented for Grok' } });
}

export async function generateStructuredMetadataWithGrok(taskId: string, _prompt: string, _article: string, _requestedModel?: string) {
    updateTask(taskId, 'FAILED', { error: { message: 'Structured metadata generation not yet implemented for Grok' } });
}

export async function generateStructuredTitlesWithGrok(taskId: string, _prompt: string, _requestedModel?: string) {
    updateTask(taskId, 'FAILED', { error: { message: 'Structured titles generation not yet implemented for Grok' } });
}

export async function generateVideoWithGrok(taskId: string, prompt: string, requestedModel?: string) {
    console.log(`Task ${taskId}: Generating video with Grok for prompt: ${prompt}, model: ${requestedModel}`);
    updateTask(taskId, 'FAILED', { error: { message: 'Grok video generation not yet implemented' } });
}
