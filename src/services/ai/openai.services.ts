import { updateTask } from '../task.service.js';

export async function generateTextWithGPT(taskId: string, _prompt: string, _requestedModel?: string) {
    updateTask(taskId, 'FAILED', { error: { message: 'OpenAI provider not yet implemented' } });
}
