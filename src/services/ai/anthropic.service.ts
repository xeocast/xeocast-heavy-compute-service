import { updateTask } from '../task.service.js';

export async function generateTextWithClaude(taskId: string, _prompt: string, _requestedModel?: string) {
    updateTask(taskId, 'FAILED', { error: { message: 'Claude provider not yet implemented' } });
}

export async function generateStructuredScriptWithClaude(taskId: string, _prompt: string, _article: string, _requestedModel?: string) {
    updateTask(taskId, 'FAILED', { error: { message: 'Structured script generation not yet implemented for Claude' } });
}