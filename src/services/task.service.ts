import { v4 as uuidv4 } from 'uuid';
import { TaskStatus, TaskUnion, TaskUnionSchema } from '../schemas/task.schemas.js';

const tasks = new Map<string, TaskUnion>();

export const createTask = (input?: unknown): string => {
  const taskId = uuidv4();
  const now = new Date().toISOString();
  const newTask: TaskUnion = {
    id: taskId,
    status: 'PENDING',
    createdAt: now,
    updatedAt: now,
    input: input,
  };

  // Validate with Zod before storing (optional, but good practice)
  try {
    TaskUnionSchema.parse(newTask);
  } catch (error) {
    console.error('Failed to validate new task:', error);
    // Depending on desired behavior, you might throw an error here
    // or handle it in a way that doesn't store an invalid task.
    // For now, we'll proceed, but this is a point of consideration.
  }

  tasks.set(taskId, newTask);
  return taskId;
};

export const getTaskById = (taskId: string): TaskUnion | undefined => {
  return tasks.get(taskId);
};

export const updateTask = (
  taskId: string,
  status: TaskStatus,
  payload?: { result?: unknown; error?: unknown }
): TaskUnion | undefined => {
  const task = tasks.get(taskId);
  if (!task) {
    return undefined;
  }

  const now = new Date().toISOString();
  let updatedTask: TaskUnion;

  switch (status) {
    case 'COMPLETED':
      // Ensure result is provided for completed tasks
      if (payload?.result === undefined) {
        console.error(`Attempted to complete task ${taskId} without a result.`);
        return undefined; // Or throw an error based on desired behavior
      }
      updatedTask = {
        id: task.id,
        createdAt: task.createdAt,
        input: task.input,
        status: 'COMPLETED',
        updatedAt: now,
        result: payload.result as any,
      };
      break;
    case 'FAILED':
      updatedTask = {
        id: task.id,
        createdAt: task.createdAt,
        input: task.input,
        status: 'FAILED',
        updatedAt: now,
        error: payload?.error ? { message: String(payload.error) } : undefined,
      };
      break;
    case 'PENDING':
    case 'PROCESSING':
      // For PENDING/PROCESSING, ensure no result or error properties are present.
      // We explicitly create a new object with only the allowed properties.
      updatedTask = {
        id: task.id,
        status: status,
        createdAt: task.createdAt,
        updatedAt: now,
        input: task.input,
      };
      break;
    default:
      // This case should ideally not be reachable given the TaskStatus enum
      throw new Error(`Unhandled task status: ${status}`);
  }
  
  // Validate with Zod before updating (optional, but good practice)
  try {
    TaskUnionSchema.parse(updatedTask);
  } catch (error) {
    console.error('Failed to validate updated task:', error);
    // Handle validation error as needed
  }

  tasks.set(taskId, updatedTask);
  return updatedTask;
};

// Optional: A way to list all tasks (for debugging or admin purposes)
export const getAllTasks = (): TaskUnion[] => {
  return Array.from(tasks.values());
};
