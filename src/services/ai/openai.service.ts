import { updateTask } from '../task.service.js';

export async function generateTextWithGPT(taskId: string, _prompt: string, _requestedModel?: string) {
    updateTask(taskId, 'FAILED', { error: { message: 'OpenAI provider not yet implemented' } });
}

export async function generateStructuredScriptWithGPT(taskId: string, _prompt: string, _article: string, _requestedModel?: string) {
    updateTask(taskId, 'FAILED', { error: { message: 'Structured script generation not yet implemented for OpenAI' } });
}

export async function generateStructuredMetadataWithGPT(taskId: string, _prompt: string, _article: string, _requestedModel?: string) {
    updateTask(taskId, 'FAILED', { error: { message: 'Structured metadata generation not yet implemented for OpenAI' } });
}

export async function generateStructuredTitlesWithGPT(taskId: string, _prompt: string, _requestedModel?: string) {
    updateTask(taskId, 'FAILED', { error: { message: 'Structured titles generation not yet implemented for OpenAI' } });
}
