import { updateTask } from '../task.service.js';

export async function generateTextWithGrok(taskId: string, _prompt: string, _requestedModel?: string) {
    updateTask(taskId, 'FAILED', { error: { message: 'Grok provider not yet implemented' } });
}
