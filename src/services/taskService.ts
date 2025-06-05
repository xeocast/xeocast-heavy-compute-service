import { v4 as uuidv4 } from 'uuid';
import { Task, TaskStatus, TaskSchema } from '../schemas/taskSchemas.js';

const tasks = new Map<string, Task>();

export const createTask = (input?: unknown): string => {
  const taskId = uuidv4();
  const now = new Date().toISOString();
  const newTask: Task = {
    id: taskId,
    status: 'PENDING',
    createdAt: now,
    updatedAt: now,
    input: input,
  };

  // Validate with Zod before storing (optional, but good practice)
  try {
    TaskSchema.parse(newTask);
  } catch (error) {
    console.error('Failed to validate new task:', error);
    // Depending on desired behavior, you might throw an error here
    // or handle it in a way that doesn't store an invalid task.
    // For now, we'll proceed, but this is a point of consideration.
  }

  tasks.set(taskId, newTask);
  return taskId;
};

export const getTaskById = (taskId: string): Task | undefined => {
  return tasks.get(taskId);
};

export const updateTask = (
  taskId: string,
  status: TaskStatus,
  payload?: { result?: unknown; error?: unknown }
): Task | undefined => {
  const task = tasks.get(taskId);
  if (!task) {
    return undefined;
  }

  const now = new Date().toISOString();
  const updatedTask: Task = {
    ...task,
    status,
    updatedAt: now,
  };

  if (payload?.result) {
    updatedTask.result = payload.result;
  }
  if (payload?.error) {
    updatedTask.error = payload.error;
  }
  
  // Validate with Zod before updating (optional, but good practice)
  try {
    TaskSchema.parse(updatedTask);
  } catch (error) {
    console.error('Failed to validate updated task:', error);
    // Handle validation error as needed
  }

  tasks.set(taskId, updatedTask);
  return updatedTask;
};

// Optional: A way to list all tasks (for debugging or admin purposes)
export const getAllTasks = (): Task[] => {
  return Array.from(tasks.values());
};
