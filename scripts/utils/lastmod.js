/**
 * 文档 sitemap lastmod 侧车文件工具
 * ====================================================================================================
 *
 * 功能概述：
 * - 在文档复制阶段收集站点内 md 文件的 git 最后提交时间
 * - 将 `版本::locale/页面路径.md -> ISO 时间` 写入构建目录下的 JSON 侧车文件
 * - VitePress 构建 sitemap 时读取该 JSON，避免额外维护数据库
 *
 * 默认输出：
 *   .cache/docs-lastmod.json
 * ====================================================================================================
 */

/* global process */

import fs from 'fs';
import path from 'path';

import { ensureDirSync } from './file.js';
import { getDirectoryLastCommitMap, getFileLastCommitIso, isGitRepo } from './git.js';

const SITE_CONTEXT_RE = /^(.*\/app\/(zh|en)\/docs\/([^/]+))(?:\/|$)/;
const LASTMOD_FILE_NAME = 'docs-lastmod.json';

/**
 * 统一路径分隔符，JSON key 和相对路径全部使用正斜杠
 * @param {string} targetPath 原始路径
 * @returns {string} 标准化路径
 */
export function normalizePath(targetPath) {
  return String(targetPath || '').replace(/\\/g, '/');
}

/**
 * 生成安全的相对路径；路径不在 from 下时返回空串
 * @param {string} from 基准目录
 * @param {string} to 目标路径
 * @returns {string} 相对路径
 */
function makeRelativePath(from, to) {
  const relative = normalizePath(path.relative(from, to));
  if (!relative || relative === '.' || relative.startsWith('../') || path.isAbsolute(relative)) {
    return '';
  }
  return relative;
}

/**
 * 根据复制到 app/{locale}/docs/{version}/... 的目标路径解析站点上下文
 * @param {string} targetPath 复制后的文件或目录路径
 * @returns {{ locale: 'zh' | 'en', version: string, versionRoot: string } | null} 站点上下文
 */
export function getSiteContext(targetPath) {
  if (!targetPath) {
    return null;
  }

  const normalized = normalizePath(path.resolve(targetPath));
  const matched = SITE_CONTEXT_RE.exec(normalized);
  if (!matched) {
    return null;
  }

  return {
    versionRoot: matched[1],
    locale: matched[2],
    version: matched[3],
  };
}

/**
 * 递归列出目录下的 md 文件，跳过 .git 目录
 * @param {string} targetDir 待扫描目录
 * @returns {string[]} md 文件绝对路径列表
 */
function listMdFiles(targetDir) {
  if (!fs.existsSync(targetDir) || !fs.statSync(targetDir).isDirectory()) {
    return [];
  }

  const result = [];
  const walk = (currentDir) => {
    for (const entry of fs.readdirSync(currentDir, { withFileTypes: true })) {
      const completePath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === '.git') {
          continue;
        }
        walk(completePath);
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        result.push(completePath);
      }
    }
  };

  walk(targetDir);
  return result;
}

/**
 * 解析 lastmod JSON 输出路径
 * @param {string} rootDir 项目根目录
 * @returns {string} JSON 文件路径
 */
export function getLastmodFilePath(rootDir) {
  if (process.env.DOCS_LASTMOD_FILE) {
    return path.resolve(process.env.DOCS_LASTMOD_FILE);
  }

  return path.join(rootDir, '.cache', LASTMOD_FILE_NAME);
}

/**
 * 读取已有 lastmod sidecar
 * @param {string} filePath JSON 文件路径
 * @returns {Record<string, string>} key -> ISO 时间
 */
export function loadLastmodStore(filePath) {
  const store = Object.create(null);
  try {
    if (!fs.existsSync(filePath)) {
      return store;
    }

    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return store;
    }

    for (const [key, value] of Object.entries(parsed)) {
      if (Object.prototype.hasOwnProperty.call(parsed, key) && typeof value === 'string' && value) {
        store[key] = value;
      }
    }
  } catch (err) {
    console.warn(`[lastmod] 读取 sidecar 失败，将使用本次复制结果重建：${filePath} - ${err.message}`);
  }

  return store;
}

/**
 * 写入 lastmod sidecar
 * @param {string} filePath JSON 文件路径
 * @param {Record<string, string>} store key -> ISO 时间
 */
export function saveLastmodStore(filePath, store) {
  try {
    ensureDirSync(path.dirname(filePath));

    const sortedStore = {};
    for (const key of Object.keys(store).sort()) {
      sortedStore[key] = store[key];
    }

    const tmpPath = `${filePath}.tmp`;
    fs.writeFileSync(tmpPath, `${JSON.stringify(sortedStore, null, 2)}\n`, 'utf-8');

    if (fs.existsSync(filePath)) {
      fs.rmSync(filePath, { force: true });
    }
    fs.renameSync(tmpPath, filePath);
  } catch (err) {
    console.warn(`[lastmod] 写入 sidecar 失败，sitemap 将回退为构建时间：${filePath} - ${err.message}`);
  }
}

/**
 * 清理某个版本的旧 lastmod 记录
 * @param {Record<string, string>} store lastmod store
 * @param {string} version 站点版本目录名
 */
export function clearVersionLastmod(store, version) {
  if (!store || !version) {
    return;
  }

  const prefix = `${version}::`;
  for (const key of Object.keys(store)) {
    if (key.startsWith(prefix)) {
      delete store[key];
    }
  }
}

/**
 * 记录一个复制目录内所有 md 文件的最后提交时间
 * @param {Record<string, string>} store lastmod store
 * @param {object} options 记录选项
 * @param {string} options.repoDir Git 仓库目录
 * @param {string} options.sourceDir 复制源目录
 * @param {string} options.targetDir 复制目标目录
 * @returns {number} 本次写入的记录数
 */
export function recordMdDirectoryLastmod(store, options) {
  if (!store || !options?.repoDir || !options?.sourceDir || !options?.targetDir) {
    return 0;
  }

  try {
    const ctx = getSiteContext(options.targetDir);
    if (!ctx) {
      return 0;
    }

    const repoDir = path.resolve(options.repoDir);
    const sourceDir = path.resolve(options.sourceDir);
    const targetDir = path.resolve(options.targetDir);
    if (!isGitRepo(repoDir) || !fs.existsSync(sourceDir)) {
      return 0;
    }

    const repoPath = makeRelativePath(repoDir, sourceDir) || '.';
    const batchCommitTimes = getDirectoryLastCommitMap(repoDir, repoPath);
    let count = 0;

    for (const sourceFile of listMdFiles(sourceDir)) {
      const sourceRelative = makeRelativePath(sourceDir, sourceFile);
      const repoFile = makeRelativePath(repoDir, sourceFile);
      const sitePath = makeRelativePath(ctx.versionRoot, path.join(targetDir, sourceRelative || ''));
      if (!sourceRelative || !repoFile || !sitePath) {
        continue;
      }

      const lastmod = batchCommitTimes.get(repoFile) || getFileLastCommitIso(repoDir, repoFile);
      if (!lastmod) {
        continue;
      }

      store[`${ctx.version}::${ctx.locale}/${sitePath}`] = lastmod;
      count += 1;
    }

    return count;
  } catch (err) {
    console.warn(`[lastmod] 记录目录提交时间失败：${options?.sourceDir} -> ${options?.targetDir} - ${err.message}`);
    return 0;
  }
}

/**
 * 记录单个复制 md 文件的最后提交时间
 * @param {Record<string, string>} store lastmod store
 * @param {object} options 记录选项
 * @param {string} options.repoDir Git 仓库目录
 * @param {string} options.sourceFile 复制源文件
 * @param {string} options.targetFile 复制目标文件
 * @returns {boolean} 是否写入成功
 */
export function recordMdFileLastmod(store, options) {
  if (!store || !options?.repoDir || !options?.sourceFile || !options?.targetFile) {
    return false;
  }

  try {
    const ctx = getSiteContext(options.targetFile);
    if (!ctx) {
      return false;
    }

    const repoDir = path.resolve(options.repoDir);
    const sourceFile = path.resolve(options.sourceFile);
    const targetFile = path.resolve(options.targetFile);
    if (!isGitRepo(repoDir) || !fs.existsSync(sourceFile)) {
      return false;
    }

    const repoFile = makeRelativePath(repoDir, sourceFile);
    const sitePath = makeRelativePath(ctx.versionRoot, targetFile);
    if (!repoFile || !sitePath) {
      return false;
    }

    const lastmod = getFileLastCommitIso(repoDir, repoFile);
    if (!lastmod) {
      return false;
    }

    store[`${ctx.version}::${ctx.locale}/${sitePath}`] = lastmod;
    return true;
  } catch (err) {
    console.warn(`[lastmod] 记录文件提交时间失败：${options?.sourceFile} -> ${options?.targetFile} - ${err.message}`);
    return false;
  }
}

/**
 * 创建 lastmod 收集器
 * @param {string} rootDir 项目根目录
 * @returns {object} 收集器
 */
export function createLastmodCollector(rootDir) {
  const filePath = getLastmodFilePath(rootDir);
  const store = loadLastmodStore(filePath);

  return {
    filePath,
    store,
    clearVersion(version) {
      clearVersionLastmod(store, version);
    },
    recordDirectory(options) {
      return recordMdDirectoryLastmod(store, options);
    },
    recordFile(options) {
      return recordMdFileLastmod(store, options);
    },
    save() {
      saveLastmodStore(filePath, store);
      console.log(`[lastmod] 已写入 ${Object.keys(store).length} 条提交时间 -> ${filePath}`);
      return store;
    },
  };
}
