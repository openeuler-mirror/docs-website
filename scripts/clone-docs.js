/**
 * 文档克隆脚本
 * ====================================================================================================
 * 
 * 功能概述：
 * - 克隆指定分支的文档内容并复制到构建目录
 * - 扫描 _toc.yaml 中的 sig 仓，克隆 sig 文档并复制到构建目录
 * - 同步 DSL 相关文档内容
 * 
 * 使用方式：
 *   在项目根目录下执行：
 *   node scripts/clone-docs.js [--branch=<branch1,branch2>] [--build=<build-path>] [--cache=<cache-path>]
 * 
 * 参数说明：
 *   --branch=<names>     指定要同步的分支名称，必需，多个分支用逗号分隔
 *   --build=<path>       指定构建目录路径，可省略，默认为当前工作目录
 *   --cache=<path>       指定缓存目录路径，可省略，默认为构建目录下的 .cache 文件夹
 * 
 * 示例：
 *   node scripts/clone-docs.js --branch=stable-common
 *   node scripts/clone-docs.js --branch=stable-common,stable-25.09 --build=./
 *   node scripts/clone-docs.js --branch=stable-common,stable-25.09 --cache=.cache
 * 
 * 工作流程：
 *   1. 解析命令行参数
 *   2. 同步 stable-common 分支中的 dsl 内容到构建目录
 *   3. 针对每个指定分支：
 *      a. 同步该分支的中英文文档
 *      b. 解析 _toc.yaml，将其中出现的远程 SIG 仓内容同步下来，并将用到的文档内容复制到构建目录中
 * 
 * 目录结构：
 *   同步后的文档将按照以下结构存放：
 *   - 中文文档: app/zh/docs/[version]/
 *   - 英文文档: app/en/docs/[version]/
 *   - DSL文档: app/.vitepress/public/dsl/
 * ====================================================================================================
 */

import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

import { VITEPRESS_VERSION_CONFIG } from './config/version.js';
import { parseNamedArgs } from './utils/common.js';
import { getGitUrlInfo, gitCloneAndCheckout } from './utils/git.js';
import { copyDirectorySync, removeSync } from './utils/file.js';

// ============================================ 脚本执行逻辑 ============================================
const args = parseNamedArgs();
const BUILD_PATH = args.build || path.resolve();
const CACHE_PATH = args.cache || path.join(BUILD_PATH, '.cache');
const BRANCH = args.branch || '';

const branches = BRANCH.split(',');
if (branches.length === 0) {
  console.error('请提供分支名称');
  process.exit(1);
}

syncDsl();
for (const branch of branches) {
  syncDocs(branch);
  syncSigDocs(branch);
}

// ============================================ 同步文档函数 ============================================
/**
 * 同步 dsl 内容
 */
function syncDsl() {
  const dslSourcePath = `${CACHE_PATH}/docs/dsl`;
  const dslTargetPath = `${BUILD_PATH}/app/.vitepress/public/dsl/`;

  gitCloneAndCheckout('https://atomgit.com/openeuler/docs.git', 'stable-common', CACHE_PATH);
  removeSync(dslTargetPath);
  copyDirectorySync(dslSourcePath, dslTargetPath);
}

/**
 * 同步文档内容到对应的目录
 * @param {string} branch 分支名
 */
function syncDocs(branch) {
  const branchName = VITEPRESS_VERSION_CONFIG[branch];
  const zhSourcePath = `${CACHE_PATH}/docs/docs/zh`;
  const zhTargetPath = `${BUILD_PATH}/app/zh/docs/${branchName}/`;
  const enSourcePath = `${CACHE_PATH}/docs/docs/en`;
  const enTargetPath = `${BUILD_PATH}/app/en/docs/${branchName}/`;

  gitCloneAndCheckout('https://atomgit.com/openeuler/docs.git', branch, CACHE_PATH);
  removeSync(zhTargetPath);
  removeSync(enTargetPath);
  copyDirectorySync(zhSourcePath, zhTargetPath);
  copyDirectorySync(enSourcePath, enTargetPath);
}

/**
 * 同步 sig 文档内容到对应的目录
 * @param {string} branch 分支名
 */
function syncSigDocs(branch) {
  const scanYaml = (obj, currentDir) => {
    if (typeof obj?.href?.upstream === 'string') {
      const { url, repo, branch, locations } = getGitUrlInfo(obj.href.upstream);
      console.log(`[syncSigDocs]: 检测到远程地址 - ${obj.href.upstream}`);
      const sourcePath = path.join(CACHE_PATH, repo, ...locations.slice(0, -1));
      const destPath = typeof obj.href.path === 'string' ? path.join(currentDir, obj.href.path) : path.join(currentDir, repo, ...locations.slice(2, -1));
      gitCloneAndCheckout(url, branch, CACHE_PATH);
      copyDirectorySync(sourcePath, destPath);
    }

    if (Array.isArray(obj.sections)) {
      obj.sections.forEach((item) => {
        scanYaml(item, currentDir);
      });
    }
  }

  const scanDir = (targetPath) => {
    if (!fs.existsSync(targetPath)) {
      console.log(`${targetPath} 不存在`);
    }

    for (const item of fs.readdirSync(targetPath)) {
      const completePath = path.join(targetPath, item);
      if (fs.statSync(completePath).isDirectory()) {
        scanDir(completePath);
      } else if (item.endsWith('.yaml')) {
        const obj = yaml.load(fs.readFileSync(completePath, 'utf-8'));
        scanYaml(obj, targetPath);
      }
    }
  };

  const branchName = VITEPRESS_VERSION_CONFIG[branch];
  scanDir(`${BUILD_PATH}/app/zh/docs/${branchName}`);
  scanDir(`${BUILD_PATH}/app/en/docs/${branchName}`);
}
