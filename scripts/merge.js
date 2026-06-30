/**
 * 文档构建内容合并脚本
 * ====================================================================================================
 *
 * 功能概述：
 * - 根据传入分支，整合构建所需的 website 代码和文档内容到构建目录
 *
 * 使用方式：
 *   在项目根目录下执行：
 *   node scripts/merge.js <branch> [source]
 *
 * 参数说明：
 *   branch               指定要处理的分支名称，必需
 *   source               指定构建来源，可选
 *
 * 示例：
 *   node scripts/merge.js stable-common
 *
 * 工作流程：
 *   1. 解析命令行参数
 *   2. 清理并重建目标构建目录
 *   3. 根据分支名判断使用哪种文档系统处理方式：
 *      a. 如果分支存在于 NEW_VERSIONS 配置中，使用 vitepress 文档处理方式
 *      b. 否则使用 hugo 文档处理方式
 *
 * 目录结构：
 *   合并后的文档将按照以下结构存放：
 *   - Vitepress文档:
 *     - 中文文档: app/zh/docs/[version]/
 *     - 英文文档: app/en/docs/[version]/
 *     - DSL文档: app/.vitepress/public/dsl/
 *   - Hugo文档:
 *     - 中文文档: content/zh/docs/[version]/
 *     - 英文文档: content/en/docs/[version]/
 * ====================================================================================================
 */

import * as fs from 'fs';
import * as path from 'path';

import { VITEPRESS_VERSIONS_CONFIG } from './config/version.js';
import { getBranchName } from './utils/common.js';
import { checkoutBranch, isGitRepo, pullRemoteBranch } from './utils/git.js';
import { copyDirectorySync, removeSync, renameSync, copyFileSync, ensureDirSync } from './utils/file.js';

// ============================================ 脚本执行逻辑 ============================================
const REPO_PATH = path.join(process.cwd(), '../../'); // repo 路径
const DOCS_VITEPRESS_PATH = path.join(REPO_PATH, 'docs'); // docs 仓库路径 （vitepress 构建所需）
const DOCS_HUGO_PATH = path.join(REPO_PATH, 'docs-centralized'); // docs-centralized 仓库路径 （hugo 构建所需）

(async () => {
  const [branch, source] = process.argv.slice(2);
  if (!branch) {
    console.error('请提供分支名称');
    process.exit(1);
  }

  // 重新创建 build 目录
  const buildPath = path.join(process.cwd(), `../../../build/${branch}`);
  removeSync(buildPath);
  ensureDirSync(buildPath);

  // 处理文档内容
  if (Object.keys(VITEPRESS_VERSIONS_CONFIG).includes(branch)) {
    normalizeVitepressDocsContent(buildPath, branch, source);
  } else {
    normalizeHugoDocsContent(buildPath, branch, source);
  }
})();

// ============================================ 文档内容处理函数 ============================================
/**
 * openatom 替换域名
 * @param {string} targetPath 开始扫描的目标路径
 */
function replaceOrgDomain(targetPath) {
  if (!fs.existsSync(targetPath)) {
    console.log(`路径 ${targetPath} 不存在`);
    return;
  }

  fs.readdirSync(targetPath).forEach((name) => {
    const completedPath = path.join(targetPath, name);
    if (fs.statSync(completedPath).isDirectory()) {
      replaceOrgDomain(completedPath);
      return;
    }

    if (!name.endsWith('js') && !name.endsWith('html') && !name.endsWith('toml') && !name.endsWith('md')) {
      return;
    }

    const content = fs.readFileSync(completedPath, 'utf8');
    const newContent = content.replace(/([a-zA-Z0-9\-]*)?\.openeuler\.org/g, (match, $1) => {
      if ($1 === 'forum' || $1 === 'pkgmanage' || $1 === 'compliance') {
        return match;
      }

      console.log('替换内容：', completedPath, `${match} -> ${`${$1 || ''}.openeuler.openatom.cn`}`);

      return `${$1 || ''}.openeuler.openatom.cn`;
    });

    fs.writeFileSync(completedPath, newContent, 'utf8');
  });
}

/**
 * 按 vitepress 文档方式处理
 * @param {string} buildPath build 目录
 * @param {string} branch 分支
 * @param {string} source 启动来源
 */
function normalizeVitepressDocsContent(buildPath, branch, source) {
  // 判断文档仓库是否存在
  if (!isGitRepo(DOCS_VITEPRESS_PATH)) {
    throw new Error(`docs 文档仓库不存在： ${DOCS_VITEPRESS_PATH}`);
  }

  const branchName = VITEPRESS_VERSIONS_CONFIG[branch] || getBranchName(branch);

  // 复制website-vitepress内容到build目录
  copyDirectorySync(path.join(REPO_PATH, 'website-vitepress'), buildPath);

  const nginxPortalConfPath = path.join(buildPath, 'deploy/nginx/nginx.portal.conf');
  if (branchName == `common`) {
    // 如果是公共分支，删掉nginx.conf并将nginx.portal.conf重命名为nginx.conf
    const nginxConfPath = path.join(buildPath, 'deploy/nginx/nginx.conf');
    removeSync(nginxConfPath);
    renameSync(nginxPortalConfPath, nginxConfPath);
  } else {
    // 如果是非公共分支，删除对应的nginx.portal.conf与中英文目录
    removeSync(nginxPortalConfPath);
    removeSync(`${buildPath}/app/zh/`);
    removeSync(`${buildPath}/app/en/`);
  }

  // 替换 vitepress 配置中的资源路径前缀
  let vpConf = fs.readFileSync(`${buildPath}/app/.vitepress/config.ts`, 'utf8');
  if (vpConf) {
    vpConf = vpConf.replace(/assetsDir:\s*'[^']*'/, `assetsDir: '/assets/${branchName}/'`);
    fs.writeFileSync(`${buildPath}/app/.vitepress/config.ts`, vpConf, 'utf8');
  }

  // 替换 package.json 中的要构建的版本
  let packageJson = fs.readFileSync(`${buildPath}/package.json`, 'utf8');
  if (packageJson) {
    packageJson = packageJson.replaceAll('$VERSION', branchName);
    fs.writeFileSync(`${buildPath}/package.json`, packageJson, 'utf8');
  }

  // 检出文档内容分支
  checkoutBranch(DOCS_VITEPRESS_PATH, branch);
  pullRemoteBranch(DOCS_VITEPRESS_PATH, branch);

  // 存在 zh 内容进行复制
  if (fs.existsSync(`${DOCS_VITEPRESS_PATH}/docs/zh/`) && (fs.existsSync(`${DOCS_VITEPRESS_PATH}/docs/zh/_toc.yaml`) || branchName === 'common')) {
    copyDirectorySync(`${DOCS_VITEPRESS_PATH}/docs/zh/`, `${buildPath}/app/zh/docs/${branchName}/`);
  }

  // 存在 en 内容进行复制
  if (fs.existsSync(`${DOCS_VITEPRESS_PATH}/docs/en/`) && (fs.existsSync(`${DOCS_VITEPRESS_PATH}/docs/en/_toc.yaml`) || branchName === 'common')) {
    copyDirectorySync(`${DOCS_VITEPRESS_PATH}/docs/en/`, `${buildPath}/app/en/docs/${branchName}/`);
  }

  // 复制 redirect.yaml
  if (fs.existsSync(`${DOCS_VITEPRESS_PATH}/_redirect.yaml`)) {
    copyFileSync(`${DOCS_VITEPRESS_PATH}/_redirect.yaml`, `${buildPath}/.cache/_redirect-${branchName}.yaml`);
  }

  // 复制 stable-common 分支下的 dsl
  if (branchName !== 'common') {
    checkoutBranch(DOCS_VITEPRESS_PATH, 'stable-common');
    pullRemoteBranch(DOCS_VITEPRESS_PATH, 'stable-common');
  }

  if (fs.existsSync(`${DOCS_VITEPRESS_PATH}/dsl/`)) {
    copyDirectorySync(`${DOCS_VITEPRESS_PATH}/dsl/`, `${buildPath}/app/.vitepress/public/dsl/`);
    if (
      source === 'test' &&
      fs.existsSync(`${buildPath}/app/.vitepress/public/dsl/zh/home_test.json`) &&
      fs.existsSync(`${buildPath}/app/.vitepress/public/dsl/en/home_test.json`)
    ) {
      removeSync(`${buildPath}/app/.vitepress/public/dsl/zh/home.json`);
      removeSync(`${buildPath}/app/.vitepress/public/dsl/en/home.json`);
      renameSync(`${buildPath}/app/.vitepress/public/dsl/zh/home_test.json`, `${buildPath}/app/.vitepress/public/dsl/zh/home.json`);
      renameSync(`${buildPath}/app/.vitepress/public/dsl/en/home_test.json`, `${buildPath}/app/.vitepress/public/dsl/en/home.json`);
    }

    console.log(`已将 dsl 复制到 public 目录下`);
  }
}

/**
 * 按 hugo 文档方式处理
 * @param {string} buildPath build 目录
 * @param {string} branch 分支
 * @param {string} source 启动来源
 */
function normalizeHugoDocsContent(buildPath, branch, source) {
  // 判断文档仓库是否存在
  if (!isGitRepo(DOCS_HUGO_PATH)) {
    throw new Error(`docs-centralized 文档仓库不存在：${DOCS_HUGO_PATH}`);
  }

  const branchName = getBranchName(branch);

  // 复制website-hugo内容到build目录
  copyDirectorySync(path.join(REPO_PATH, 'website-hugo'), buildPath);

  // 替换 config.toml 中的资源路径前缀
  let hugoConf = fs.readFileSync(`${buildPath}/config.toml`, 'utf8');
  if (hugoConf) {
    hugoConf = hugoConf.replace(/resourceURL\s*=\s*(["'])(.*?)\1/, `resourceURL = "/docs/${branchName}/"`);
    fs.writeFileSync(`${buildPath}/config.toml`, hugoConf, 'utf8');
  }

  // 检出文档内容分支
  checkoutBranch(DOCS_HUGO_PATH, branch);
  pullRemoteBranch(DOCS_HUGO_PATH, branch);

  // 存在 zh 内容进行复制
  if (fs.existsSync(`${DOCS_HUGO_PATH}/docs/zh/`)) {
    copyDirectorySync(`${DOCS_HUGO_PATH}/docs/zh/`, `${buildPath}/content/zh/docs/${branchName}/`);
  }

  // 存在 en 内容进行复制
  if (fs.existsSync(`${DOCS_HUGO_PATH}/docs/en/`)) {
    copyDirectorySync(`${DOCS_HUGO_PATH}/docs/en/`, `${buildPath}/content/en/docs/${branchName}/`);
  }

  // 构建来源是 openatom 进行域名替换
  if (source === 'openatom') {
    replaceOrgDomain(path.join(buildPath, 'i18n'));
    replaceOrgDomain(path.join(buildPath, 'layouts'));
    replaceOrgDomain(path.join(buildPath, 'static'));
    replaceOrgDomain(path.join(buildPath, 'content'));
  }
}
