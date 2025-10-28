import path from 'path';
import fs from 'fs';

/**
 * 复制目录
 * @param {string} sourceDir 源目录
 * @param {string} destDir 目标目录
 * @param {boolean} slient 是否禁止提示输出，默认输出
 */
export function copyDirectorySync(sourceDir, destDir, slient) {
  if (!fs.existsSync(sourceDir)) {
    console.log(`[copyDirectorySync]：源路径 ${sourceDir} 不存在，跳过复制`);
    return;
  }

  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, {
      recursive: true,
    });
  }

  fs.readdirSync(sourceDir, { withFileTypes: true }).forEach((item) => {
    const sourcePath = path.join(sourceDir, item.name);
    const targetPath = path.join(destDir, item.name);

    if (item.isDirectory()) {
      copyDirectorySync(sourcePath, targetPath, true);
    } else {
      fs.copyFileSync(sourcePath, targetPath);
    }
  });

  if (!slient) {
    console.log(`[copyDirectorySync]：成功复制 ${sourceDir} 到 ${destDir}`);
  }
}

/**
 * 复制文件
 * @param {string} sourcePath 源文件
 * @param {string} destPath 目标路径
 * @param {boolean} slient 是否禁止提示输出，默认输出
 */
export function copyFileSync(sourcePath, destPath, slient) {
  if (!fs.existsSync(sourcePath)) {
    console.log(`[copyFileSync]：源文件 ${sourcePath} 不存在，跳过复制`);
    return;
  }

  const destDir = path.dirname(destPath);
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, {
      recursive: true,
    });
  }

  fs.copyFileSync(sourcePath, destPath);

  if (!slient) {
    console.log(`[copyFileSync]：成功复制 ${sourcePath} 到 ${destPath}`);
  }
}

/**
 * 删除文件或目录
 * @param {string} targetPath 目标路径
 * @param {boolean} slient 是否禁止提示输出，默认输出
 */
export function removeSync(targetPath, slient) {
  if (fs.existsSync(targetPath)) {
    fs.rmSync(targetPath, {
      recursive: true,
      force: true,
      maxRetries: 10,
      retryDelay: 100,
    });

    if (!slient) {
      console.log(`[removeSync]：成功删除 ${targetPath}`);
    }
  }
}

/**
 * 确保目录存在
 * @param {string} dir - 目录路径
 */
export function ensureDirSync(dir) {
  const normalizedPath = path.resolve(dir);
  if (fs.existsSync(normalizedPath) && !fs.statSync(normalizedPath).isDirectory()) {
    throw new Error(`[ensureDirSync]：${normalizedPath} 已存在但非目录`);
  }

  fs.mkdirSync(normalizedPath, {
    recursive: true,
  });
}


/**
 * 重命名文件或目录
 * @param {string} oldPath 原始路径
 * @param {string} newPath 新路径
 * @param {boolean} slient 是否禁止提示输出，默认输出
 */
export function renameSync(oldPath, newPath, slient) {
  if (fs.existsSync(oldPath)) {
    fs.renameSync(oldPath, newPath);
    
    if (!slient) {
      console.log(`[renameSync]：已将 ${oldPath} 重命名为 ${newPath}`);
    }
  }
}
