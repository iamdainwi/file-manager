import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

const LOG_DIR = path.resolve('data', 'logs');
const LOG_FILE = path.join(LOG_DIR, 'activities.jsonl');

export const itemType = Object.freeze({
  FILE: 'FILE',
  DIRECTORY: 'DIRECTORY',
});

export async function logActivity({
  action,
  itemName,
  itemPath,
  itemType = itemType,
  status = 'SUCCESS',
  details = {},
}) {
  try {
    await fs.mkdir(LOG_DIR, { recursive: true });

    const activity = {
      id: randomUUID(),
      timestamp: new Date().toISOString(),

      item_type: itemType, // FILE or DIRECTORY
      action, // FILE_CREATED, DIRECTORY_MOVED, etc.

      item_name: itemName,
      item_path: itemPath,

      status,
      details,
    };

    await fs.appendFile(LOG_FILE, JSON.stringify(activity) + '\n', 'utf8');

    return activity;
  } catch (error) {
    throw new Error(`Failed to record activity: ${error.message}`, {
      cause: error,
    });
  }
}
