/**
 * This file only has responsibility to work with directories
 * This file contains:
 * checkDir() function that checks whether the directory exists or not -> Completed
 * createDir() function to create directory -> Completed
 * deleteDir() function to delete directory
 * getDirInfo() function to get directory information -> Completed
 * TODO: moveDir() function to move the directory from one to another place
 * TODO: copyDir() function to copy directory from one to another place
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
        status: ITEM_STATUS.SUCESS,
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
  const fullPath = getFullPath(sourcePath);
  try {
    await fs.cp
  } catch (error) {

  }
}