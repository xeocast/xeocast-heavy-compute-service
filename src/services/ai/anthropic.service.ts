import { updateTask } from '../task.service.js';

export async function generateTextWithClaude(taskId: string, _prompt: string, _requestedModel?: string) {
    updateTask(taskId, 'FAILED', { error: { message: 'Claude provider not yet implemented' } });
}

export async function generateStructuredScriptWithClaude(taskId: string, _prompt: string, _article: string, _requestedModel?: string) {
    updateTask(taskId, 'FAILED', { error: { message: 'Structured script generation not yet implemented for Claude' } });
}

export async function generateStructuredMetadataWithClaude(taskId: string, _prompt: string, _article: string, _requestedModel?: string) {
    updateTask(taskId, 'FAILED', { error: { message: 'Structured metadata generation not yet implemented for Claude' } });
}

export async function generateStructuredTitlesWithClaude(taskId: string, _prompt: string, _requestedModel?: string) {
    updateTask(taskId, 'FAILED', { error: { message: 'Structured titles generation not yet implemented for Claude' } });
}

export async function generateVideoWithClaude(taskId: string, prompt: string, requestedModel?: string) {
    console.log(`Task ${taskId}: Generating video with Claude for prompt: ${prompt}, model: ${requestedModel}`);
    updateTask(taskId, 'FAILED', { error: { message: 'Claude video generation not yet implemented' } });
}