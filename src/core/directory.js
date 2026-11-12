/**
 * This file only has responsibility to work with directories
 * This file contains:
 * checkDir() function that checks whether the directory exists or not -> Completed
 * createDir() function to create directory -> Completed
 * deleteDir() function to delete directory
 * getDirInfo() function to get directory information -> Completed
 * moveDir() function to move the directory from one to another place -> Completed
 * copyDir() function to copy directory from one to another place -> Completed
 * renameDir() function to rename the directory -> Completed
 */

import * as fs from 'node:fs/promises';
import { itemType, logActivity } from '../audit/activity-logger.js';
import { DirectoryActivityType, ITEM_STATUS } from '../config/constants.js';
import path from 'node:path';
import process from 'node:process';

const getFullPath = (dirName) => path.resolve(process.cwd(), dirName);

async function checkDir(dirName) {
  const fullPath = getFullPath(dirName);

  try {
    const stats = await fs.stat(fullPath);

    await logActivity({
      action: DirectoryActivityType.DIRECTORY_EXISTS,
      itemType: itemType.DIRECTORY,
      itemName: dirName,
      itemPath: fullPath,
      status: ITEM_STATUS.SUCCESS,
    });

    return stats.isDirectory();
  } catch (error) {
    await logActivity({
      action: DirectoryActivityType.DIRECTORY_EXISTS,
      itemType: itemType.DIRECTORY,
      itemName: dirName,
      itemPath: fullPath,
      status: ITEM_STATUS.FAILED,
      details: {
        error: error.message,
        code: error.code,
      },
    });

    return false;
  }
}

async function getDirInfo(dirName) {
  const fullPath = getFullPath(dirName);
  try {
    const dirInfo = await fs.stat(fullPath);

    await logActivity({
      action: DirectoryActivityType.DIRECTORY_INFO,
      itemType: itemType.DIRECTORY,
      itemName: dirName,
      itemPath: fullPath,
      status: ITEM_STATUS.SUCCESS,
    });

    return {
      size: `${(dirInfo.size / 1024).toFixed(2)} KB`,
      created_at: dirInfo.birthtime.toLocaleString(),
      last_accessed: dirInfo.mtime.toLocaleString(),
    };
  } catch (error) {
    await logActivity({
      action: DirectoryActivityType.DIRECTORY_INFO,
      itemType: itemType.DIRECTORY,
      itemName: dirName,
      itemPath: fullPath,
      status: ITEM_STATUS.FAILED,
      details: {
        error: error.message,
        code: error.code,
        syscall: error.syscall,
        path: error.path || fullPath,
      },
    });

    return {
      error: true,
      message: error.message,
      code: error.code,
    };
  }
}

async function createDir(dirName) {
  const fullPath = getFullPath(dirName);
  let dirpath = fullPath;

  try {
    const exists = await checkDir(dirName);

    if (exists) {
      console.log(`Directory '${dirName}' is already present.`);

      await logActivity({
        action: DirectoryActivityType.DIRECTORY_CREATED,
        itemPath: fullPath,
        itemName: dirName,
        itemType: itemType.DIRECTORY,
        status: ITEM_STATUS.SKIPPED,
        details: { reason: 'already_exists' },
      });
      return true;
    }

    dirpath = await fs.mkdir(fullPath, { recursive: true });

    await logActivity({
      action: DirectoryActivityType.DIRECTORY_CREATED,
      itemPath: dirpath || fullPath,
      itemName: dirName,
      itemType: itemType.DIRECTORY,
      status: ITEM_STATUS.SUCCESS,
    });

    return true;
  } catch (error) {
    console.error('Failed to create directory:', error);

    await logActivity({
      action: DirectoryActivityType.DIRECTORY_CREATED,
      itemPath: dirpath,
      itemName: dirName,
      itemType: itemType.DIRECTORY,
      status: ITEM_STATUS.FAILED,
      details: {
        error: error.message,
        code: error.code,
      },
    });

    return false;
  }
}

async function deleteDir(dirName) {
  const fullPath = getFullPath(dirName);
  try {
    await fs.rmdir(fullPath);

    await logActivity({
      action: DirectoryActivityType.DIRECTORY_DELETED,
      itemPath: fullPath,
      itemName: dirName,
      itemType: itemType.DIRECTORY,
      status: ITEM_STATUS.SUCCESS,
    });
  } catch (error) {
    await logActivity({
      action: DirectoryActivityType.DIRECTORY_DELETED,
      itemPath: fullPath,
      itemName: dirName,
      itemType: itemType.DIRECTORY,
      status: ITEM_STATUS.FAILED,
      details: {
        error: error.message,
        code: error.code,
      },
    });

    console.error(error);
  }
}

async function renameDir(dirName, newName) {
  const fullPath = getFullPath(dirName);
  try {
    const isExists = await checkDir(newName);
    const getinfo = async (isExists) => {
      if (isExists) {
        console.error('DIRECTORY_ALREADY_EXISTS');
        return;
      }

      await logActivity({
        action: DirectoryActivityType.DIRECTORY_RENAMED,
        itemName: 'contents',
        itemType: itemType.DIRECTORY,
        itemPath: fullPath,
        status: ITEM_STATUS.SUCCESS,
        details: {
          message: 'Directory has been renamed',
          from: dirName,
          to: newName,
        },
      });

      await fs.rename(fullPath, newName);
      return;
    };

    await getinfo(isExists);
    return;
  } catch (error) {
    await logActivity({
      action: DirectoryActivityType.DIRECTORY_RENAMED,
      itemName: 'contents',
      itemType: itemType.DIRECTORY,
      itemPath: fullPath,
      status: ITEM_STATUS.FAILED,
      details: {
        message: error.message,
        from: dirName,
        to: newName,
      },
    });
  }
}

async function moveDir(sourcePath, destPath) {
  const fullSourcePath = getFullPath(sourcePath);

  const itemName = path.basename(fullSourcePath);
  const fullDestPath = path.join(getFullPath(destPath), itemName);

  try {
    const sourceStat = await fs.stat(fullSourcePath);

    if (!sourceStat.isDirectory()) {
      throw new Error('Source is not a directory');
    }

    const relativePath = path.relative(fullSourcePath, fullDestPath);

    if (
      relativePath === '' ||
      (!relativePath.startsWith('..' + path.sep) &&
        relativePath !== '..' &&
        !path.isAbsolute(relativePath))
    ) {
      throw new Error('Cannot move directory into itself');
    }

    try {
      await fs.access(fullDestPath);
      throw new Error('Destination already exists');
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }

    await fs.cp(fullSourcePath, fullDestPath, {
      recursive: true,
      errorOnExist: true,
      force: false,
    });

    await fs.rm(fullSourcePath, {
      recursive: true,
      force: false,
    });

    await logActivity({
      action: DirectoryActivityType.DIRECTORY_MOVED,
      itemName,
      itemPath: fullDestPath,
      itemType: itemType.DIRECTORY,
      status: ITEM_STATUS.SUCCESS,
      details: {
        previousPath: fullSourcePath,
        destinationPath: fullDestPath,
      },
    });

    return true;
  } catch (error) {
    console.error(error.message);

    await logActivity({
      action: DirectoryActivityType.DIRECTORY_MOVED,
      itemName,
      itemPath: fullSourcePath,
      itemType: itemType.DIRECTORY,
      status: ITEM_STATUS.FAILED,
      details: {
        error: error.message,
        errorCode: error.code ?? null,
      },
    });

    return false;
  }
}

async function copyDir(sourcePath, destPath) {
  const fullSourcePath = getFullPath(sourcePath);

  const itemName = path.basename(fullSourcePath);
  const fullDestPath = path.join(getFullPath(destPath), itemName);

  try {
    const sourceStat = await fs.stat(fullSourcePath);

    if (!sourceStat.isDirectory()) {
      throw new Error('Source is not a directory');
    }

    const relativePath = path.relative(fullSourcePath, fullDestPath);

    if (
      relativePath === '' ||
      (!relativePath.startsWith('..' + path.sep) &&
        relativePath !== '..' &&
        !path.isAbsolute(relativePath))
    ) {
      throw new Error('Cannot move directory into itself');
    }

    try {
      await fs.access(fullDestPath);
      throw new Error('Destination already exists');
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }

    await fs.cp(fullSourcePath, fullDestPath, {
      recursive: true,
      errorOnExist: true,
      force: false,
    });

    await logActivity({
      action: DirectoryActivityType.DIRECTORY_COPIED,
      itemName,
      itemPath: fullDestPath,
      itemType: itemType.DIRECTORY,
      status: ITEM_STATUS.SUCCESS,
      details: {
        previousPath: fullSourcePath,
        destinationPath: fullDestPath,
      },
    });

    return true;
  } catch (error) {
    console.error(error.message);

    await logActivity({
      action: DirectoryActivityType.DIRECTORY_COPIED,
      itemName,
      itemPath: fullSourcePath,
      itemType: itemType.DIRECTORY,
      status: ITEM_STATUS.FAILED,
      details: {
        error: error.message,
        errorCode: error.code ?? null,
      },
    });

    return false;
  }
}

copyDir('data/images', 'contents/');
// copyDir('contents/images', 'data/');
