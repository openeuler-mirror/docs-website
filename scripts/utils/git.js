import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { platform } from 'node:os';

import { ensureDirSync, removeSync } from './file.js';

// Windows 的 NTFS 文件系统无法表示以点或空格结尾的文件名（如 dpu-utilities 的
// qtfs/magic_send...），会导致 git 检出失败；Linux/macOS 无此限制，保持原有行为
const IS_WINDOWS = platform() === 'win32';

// git 引用名禁用字符，用于防止命令注入
const GIT_REFNAME_FORBIDDEN = /[\s~^:?*[\\]|\.\.|@{|\/\.\/|\/$|^-|^\.|^\.\.$/;

/**
 * 校验 Git 仓库地址，防止命令注入
 * @param {string} url - Git 仓库地址
 */
function assertValidGitUrl(url) {
  if (typeof url !== 'string' || url.length === 0) {
    throw new Error(`[git] 非法的仓库地址: ${url}`);
  }
  const parsed = new URL(url);
  if (!/^https?:$|^git$|^ssh$|^git\+ssh:$/.test(parsed.protocol)) {
    throw new Error(`[git] 不支持的协议: ${parsed.protocol} (仅允许 http/https/git/ssh)`);
  }
  if (/[\s\r\n]/.test(url)) {
    throw new Error(`[git] 仓库地址包含空白/控制字符: ${url}`);
  }
}

/**
 * 校验 Git 分支名，防止命令注入
 * @param {string} branch - 分支名
 */
function assertValidGitBranch(branch) {
  if (typeof branch !== 'string' || branch.length === 0) {
    throw new Error(`[git] 非法的分支名: ${branch}`);
  }
  if (branch.startsWith('-') || GIT_REFNAME_FORBIDDEN.test(branch)) {
    throw new Error(`[git] 非法的分支名(包含禁用字符或以 - 开头): ${branch}`);
  }
}

/**
 * 执行 git 命令（参数数组形式，避免 shell 注入）
 * @param {string[]} args - git 参数数组
 * @param {object} [options] - execFileSync 选项
 * @returns {string} 命令输出
 */
function git(args, options) {
  return execFileSync('git', args, { stdio: 'pipe', encoding: 'utf-8', ...options });
}

/**
 * 执行 git 命令（输出继承父进程）
 * @param {string[]} args - git 参数数组
 * @param {object} [options] - execFileSync 选项
 */
function gitInherit(args, options) {
  execFileSync('git', args, { stdio: 'inherit', ...options });
}

/**
 * 解析 Git 仓库 URL，提取仓库信息
 * @param {string} gitUrl - 完整的 Git 仓库 URL 地址
 * @returns {object} 包含URL解析信息的对象
 */
export function getGitUrlInfo(gitUrl) {
  const url = new URL(gitUrl);
  const [owner, repo, __, branch, ...locations] = url.pathname.replace('/', '').split('/');

  if (locations.length) {
    for (let i = 0; i < locations.length; i++) {
      locations[i] = decodeURIComponent(locations[i]);
    }
  }

  return {
    url: `${url.origin}/${owner}/${repo}`,
    owner,
    repo,
    branch,
    locations,
  }
}

/**
 * 检查指定路径是否为 Git 仓库
 * @param {string} targetPath - 要检查的目标路径
 * @returns {boolean} 如果目标路径是 Git 仓库则返回 true，否则返回 false
 */
export function isGitRepo(targetPath) {
  return fs.existsSync(path.join(targetPath, '.git/config'));
}

/**
 * 拉取并切换分支
 * @param {string} url 远程仓库地址
 * @param {string} branch 分支名
 * @param {string} storagePath 存放目录
 */
export function gitCloneAndCheckout(url, branch, storagePath) {
  assertValidGitUrl(url);
  assertValidGitBranch(branch);
  ensureDirSync(storagePath);
  const repo = url.split('/').slice().pop().replace('.git', '');
  const repoDir = path.join(storagePath, repo);

  // 拉取远程仓库
  if (!fs.existsSync(repoDir) || (fs.existsSync(repoDir) && !isGitRepo(repoDir))) {
    removeSync(repoDir);
    try {
      gitInherit(['clone', '--', url, repoDir]);
      console.log(`[gitCloneAndCheckout]：克隆 ${repo} 仓库成功! `);
    } catch (err) {
      if (!IS_WINDOWS) {
        throw err;
      }
      // Windows 下仓库含 NTFS 无法表示的文件名（如以点或空格结尾）时，clone 的工作区检出会失败，
      // 但仓库数据已下载完成，可在后续步骤中恢复工作区
      console.warn(`[gitCloneAndCheckout]：克隆 ${repo} 检出工作区失败，将尝试恢复：${err.message}`);
    }
  }

  // 清理并恢复工作区（跳过 NTFS 无法表示的文件）
  restoreWorktree(repoDir);

  // 切换目标分支
  gitInherit(['pull'], { cwd: repoDir });
  const branchList = git(['branch', '--list', branch], { cwd: repoDir }).trim();
  if (!branchList) {
    console.log(`[gitCloneAndCheckout]：本地不存在分支 ${branch}，开始尝试拉取并切换远程分支`);
    try {
      gitInherit(['checkout', '-b', branch, '--track', `origin/${branch}`], { cwd: repoDir });
      console.log(`[gitCloneAndCheckout]：拉取并切换远程分支 ${branch} 成功`);
    } catch (err) {
      if (!IS_WINDOWS) {
        throw err;
      }
      console.warn(`[gitCloneAndCheckout]：创建分支 ${branch} 失败：${err.message}`);
      restoreWorktree(repoDir);
    }
    return;
  }

  console.log(`[gitCloneAndCheckout]：本地存在分支 ${branch}，开始切换分支`);
  try {
    gitInherit(['checkout', '-f', branch], { cwd: repoDir });
    console.log(`[gitCloneAndCheckout]：切换分支成功，开始拉取远程更新内容`);
    gitInherit(['pull', 'origin', branch], { cwd: repoDir });
    console.log(`[gitCloneAndCheckout]：拉取远程内容成功`);
  } catch {
    console.log(`[gitCloneAndCheckout]：拉取远程内容失败，尝试强制拉取`);
    try {
      gitInherit(['reset', '--hard', `origin/${branch}`], { cwd: repoDir });
      console.log(`[gitCloneAndCheckout]：拉取远程分支 ${branch} 内容成功`);
    } catch (resetErr) {
      if (!IS_WINDOWS) {
        throw resetErr;
      }
      // Windows 下 reset 同样受 NTFS 文件名限制影响，转为重新恢复工作区
      console.warn(`[gitCloneAndCheckout]：强制拉取失败，重新恢复工作区：${resetErr.message}`);
      restoreWorktree(repoDir);
    }
  }

  // 清除索引中 NTFS 无法表示的文件，保证工作区状态一致
  if (IS_WINDOWS) {
    dropInvalidNtfsPaths(repoDir);
  }
}

/**
 * 清理并恢复 Git 工作区文件
 * Windows 的 NTFS 文件系统无法表示以点或空格结尾的文件名（如 dpu-utilities 的
 * qtfs/magic_send...），这类文件无法被 git 检出，会导致 checkout 命令失败，
 * 这里跳过该类文件并继续恢复其余文件；非 Windows 平台无此限制，保持原有行为
 * @param {string} repoDir - Git 仓库路径
 */
function restoreWorktree(repoDir) {
  try {
    gitInherit(['clean', '-fd'], { cwd: repoDir });
    gitInherit(['checkout', 'HEAD', '--', '.'], { cwd: repoDir });
  } catch (err) {
    if (!IS_WINDOWS) {
      throw err;
    }
    console.warn(`[gitCloneAndCheckout]：检出工作区失败（多为 NTFS 文件名限制导致）：${err.message}`);
  }
  if (IS_WINDOWS) {
    dropInvalidNtfsPaths(repoDir);
  }
}

/**
 * 从 Git 索引中移除 NTFS 无法表示的文件（以点或空格结尾，或为系统保留设备名），
 * 避免后续 pull / checkout / reset 等操作反复失败
 * @param {string} repoDir - Git 仓库路径
 */
function dropInvalidNtfsPaths(repoDir) {
  const tracked = git(['ls-files', '-z'], { cwd: repoDir, encoding: 'utf8' }).split('\0').filter(Boolean);
  const invalid = tracked.filter((p) => /(?:^|\/)[^/]+[. ]$/.test(p) || /(?:^|\/)(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(p));
  for (const file of invalid) {
    try {
      gitInherit(['update-index', '--force-remove', '--', file], { stdio: 'ignore', cwd: repoDir });
    } catch {
      // 单个文件移除失败不影响其余文件
    }
  }
}

/**
 * 切换到指定的 Git 分支
 * @param {string} repoPath - Git 仓库的本地路径
 * @param {string} branch - 要切换到的分支名称
 */
export function checkoutBranch(repoPath, branch) {
  assertValidGitBranch(branch);
  console.log(`[checkoutBranch]：开始检出 ${branch} 分支`);
  gitInherit(['checkout', branch], { cwd: repoPath });

  console.log(`[checkoutBranch]：成功在 ${repoPath} 检出 ${branch} 分支`);
};

/**
 * 拉取远程分支的内容
 * @param {string} repoPath - Git 仓库的本地路径
 * @param {string} branch - 要拉取的远程分支名称
 */
export function pullRemoteBranch(repoPath, branch) {
  assertValidGitBranch(branch);
  console.log(`[pullRemoteBranch]：开始拉取 ${branch} 分支`);
  gitInherit(['pull', 'origin', branch], { cwd: repoPath });

  console.log(`[pullRemoteBranch]：成功拉取远程 ${branch} 分支`);
};
