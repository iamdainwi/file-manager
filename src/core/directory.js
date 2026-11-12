/**
 * This file only have responsiblity to work with directories
 * This file contains:
 * checkDir() function that check wheather the directory exists or not
 * createDir() function to create directory
 * deleteDir() function to delete directory
 * getDirInfo() function to get directory infromation
 */

import * as fs from 'node:fs/promises';
import { itemType, logActivity } from '../audit/activity-logger.js';
import { DirectoryActivityType, ITEM_STATUS } from '../config/constants.js';

async function checkDir(dirName) {
  try {
    const isExists = await fs.stat(dirName);
    await logActivity({
      action: DirectoryActivityType.DIRECTORY_EXISTS,
      itemType: itemType.DIRECTORY,
      itemName: dirName,
      status: ITEM_STATUS.SUCESS,
    });
    // console.log('DIR_EXISTS');
    if (isExists) return true;
  } catch (error) {
    await logActivity({
      action: DirectoryActivityType.DIRECTORY_EXISTS,
      itemType: itemType.DIRECTORY,
      itemName: dirName,
      status: ITEM_STATUS.FAILED,
    });
    // console.error('DIR_NOT_EXISTS');
    return false;
  }
}

async function getDirInfo(dirName) {
  try {
    const dirInfo = await fs.stat(dirName);
    await logActivity({
      action: DirectoryActivityType.DIRECTORY_INFO,
      itemType: 'DIRECTORY',
      itemName: dirName,
      itemPath: await fs.realpath(dirName),
      status: ITEM_STATUS.SUCESS,
    });

    return {
      size: dirInfo.size / 1024 + 'KB',
      created_at: dirInfo.birthtime.toLocaleString(),
      last_accessed: dirInfo.mtime.toLocaleString(),
    };
  } catch (error) {
    await logActivity({
      action: DirectoryActivityType.DIRECTORY_INFO,
      itemType: 'DIRECTORY',
      itemName: dirName,
      status: ITEM_STATUS.FAILED,

      details: {
        error: error.message.split(': ')[1].split(', ')[0],
        code: error.code,
        syscall: error.syscall,
        dir_name: error.path,
      },
    });
    return error.message.split(': ')[1].split(', ')[0];
  }
}

async function createDir(dirName) {
  try {
    //TODO: complete the create dir function
  } catch (error) {}
}
