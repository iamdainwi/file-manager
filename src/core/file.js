import * as fs from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import { itemType, logActivity } from '../audit/activity-logger.js';
import { FileActivityType, ITEM_STATUS } from '../config/constants.js';

const getFullPath = (fileName) => path.resolve(process.cwd(), fileName);

async function recordActivity(action, filePath, status, details = {}) {
  await logActivity({
    action,
    itemType: itemType.FILE,
    itemName: path.basename(filePath),
    itemPath: filePath,
    status,
    details,
  });
}

export async function checkFile(fileName) {
  const fullPath = getFullPath(fileName);

  try {
    const stats = await fs.stat(fullPath);

    await recordActivity(
      FileActivityType.FILE_EXISTS,
      fullPath,
      ITEM_STATUS.SUCCESS,
    );

    return stats.isFile();
  } catch (error) {
    await recordActivity(
      FileActivityType.FILE_EXISTS,
      fullPath,
      ITEM_STATUS.FAILED,
      {
        error: error.message,
        code: error.code,
      },
    );

    return false;
  }
}

export async function getFileInfo(fileName) {
  const fullPath = getFullPath(fileName);

  try {
    const stats = await fs.stat(fullPath);

    if (!stats.isFile()) {
      throw new Error('Path is not a file');
    }

    await recordActivity(
      FileActivityType.FILE_INFO,
      fullPath,
      ITEM_STATUS.SUCCESS,
    );

    return {
      name: path.basename(fullPath),
      extension: path.extname(fullPath),
      size: `${(stats.size / 1024).toFixed(2)} KB`,
      sizeBytes: stats.size,
      created_at: stats.birthtime.toLocaleString(),
      last_modified: stats.mtime.toLocaleString(),
      last_accessed: stats.atime.toLocaleString(),
    };
  } catch (error) {
    await recordActivity(
      FileActivityType.FILE_INFO,
      fullPath,
      ITEM_STATUS.FAILED,
      {
        error: error.message,
        code: error.code,
      },
    );

    return {
      error: true,
      message: error.message,
      code: error.code,
    };
  }
}

export async function createFile(fileName, content = '') {
  const fullPath = getFullPath(fileName);

  try {
    await fs.writeFile(fullPath, content, {
      flag: 'wx',
    });

    await recordActivity(
      FileActivityType.FILE_CREATED,
      fullPath,
      ITEM_STATUS.SUCCESS,
    );

    return true;
  } catch (error) {
    await recordActivity(
      FileActivityType.FILE_CREATED,
      fullPath,
      ITEM_STATUS.FAILED,
      {
        error: error.message,
        code: error.code,
      },
    );

    return false;
  }
}

export async function deleteFile(fileName) {
  const fullPath = getFullPath(fileName);

  try {
    const stats = await fs.stat(fullPath);

    if (!stats.isFile()) {
      throw new Error('Path is not a file');
    }

    await fs.unlink(fullPath);

    await recordActivity(
      FileActivityType.FILE_DELETED,
      fullPath,
      ITEM_STATUS.SUCCESS,
    );

    return true;
  } catch (error) {
    await recordActivity(
      FileActivityType.FILE_DELETED,
      fullPath,
      ITEM_STATUS.FAILED,
      {
        error: error.message,
        code: error.code,
      },
    );

    return false;
  }
}

export async function renameFile(fileName, newName) {
  const fullPath = getFullPath(fileName);

  try {
    if (!newName || path.basename(newName) !== newName) {
      throw new Error('Provide a valid new filename');
    }

    const stats = await fs.stat(fullPath);

    if (!stats.isFile()) {
      throw new Error('Path is not a file');
    }

    const newPath = path.join(path.dirname(fullPath), newName);

    await fs.access(newPath).then(
      () => {
        throw new Error('Destination already exists');
      },
      (error) => {
        if (error.code !== 'ENOENT') throw error;
      },
    );

    await fs.rename(fullPath, newPath);

    await recordActivity(
      FileActivityType.FILE_RENAMED,
      newPath,
      ITEM_STATUS.SUCCESS,
      {
        previousPath: fullPath,
        newPath,
      },
    );

    return true;
  } catch (error) {
    await recordActivity(
      FileActivityType.FILE_RENAMED,
      fullPath,
      ITEM_STATUS.FAILED,
      {
        error: error.message,
        code: error.code,
        newName,
      },
    );

    return false;
  }
}

export async function moveFile(sourcePath, destPath) {
  const fullSourcePath = getFullPath(sourcePath);
  const fullDestDir = getFullPath(destPath);

  const itemName = path.basename(fullSourcePath);
  const fullDestPath = path.join(fullDestDir, itemName);

  try {
    const sourceStats = await fs.stat(fullSourcePath);

    if (!sourceStats.isFile()) {
      throw new Error('Source is not a file');
    }

    const destStats = await fs.stat(fullDestDir);

    if (!destStats.isDirectory()) {
      throw new Error('Destination is not a directory');
    }

    try {
      await fs.access(fullDestPath);
      throw new Error('Destination already exists');
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }

    try {
      await fs.rename(fullSourcePath, fullDestPath);
    } catch (error) {
      if (error.code !== 'EXDEV') throw error;

      await fs.copyFile(fullSourcePath, fullDestPath, constants.COPYFILE_EXCL);

      await fs.unlink(fullSourcePath);
    }

    await recordActivity(
      FileActivityType.FILE_MOVED,
      fullDestPath,
      ITEM_STATUS.SUCCESS,
      {
        previousPath: fullSourcePath,
        destinationPath: fullDestPath,
      },
    );

    return true;
  } catch (error) {
    await recordActivity(
      FileActivityType.FILE_MOVED,
      fullSourcePath,
      ITEM_STATUS.FAILED,
      {
        error: error.message,
        code: error.code ?? null,
        destinationPath: fullDestPath,
      },
    );

    return false;
  }
}

export async function copyFile(sourcePath, destPath) {
  const fullSourcePath = getFullPath(sourcePath);
  const fullDestDir = getFullPath(destPath);

  const itemName = path.basename(fullSourcePath);
  const fullDestPath = path.join(fullDestDir, itemName);

  try {
    const sourceStats = await fs.stat(fullSourcePath);

    if (!sourceStats.isFile()) {
      throw new Error('Source is not a file');
    }

    const destStats = await fs.stat(fullDestDir);

    if (!destStats.isDirectory()) {
      throw new Error('Destination is not a directory');
    }

    await fs.copyFile(fullSourcePath, fullDestPath, constants.COPYFILE_EXCL);

    await recordActivity(
      FileActivityType.FILE_COPIED,
      fullDestPath,
      ITEM_STATUS.SUCCESS,
      {
        sourcePath: fullSourcePath,
        destinationPath: fullDestPath,
      },
    );
    return true;
  } catch (error) {
    console.error(error);
    await recordActivity(
      FileActivityType.FILE_COPIED,
      fullSourcePath,
      ITEM_STATUS.FAILED,
      {
        error: error.message,
        code: error.code ?? null,
        destinationPath: fullDestPath,
      },
    );

    return false;
  }
}

copyFile('data/logs/activities.jsonl', 'logs/');
