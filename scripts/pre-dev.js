import fs from 'fs-extra';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

import { getGitUrlInfo, isGitRepo } from './utils/git.js';
import { getBranchName } from './utils/common.js';
import { copyDirectorySync } from './utils/file.js';

const __dirname = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const CACHE_DIR = path.join(__dirname, '.cache');

/**
 * 拉取并切换分支
 * @param {string} url 远程仓库地址
 * @param {string} branch 分支名
 */
function gitCloneAndCheckout(url, branch) {
  fs.ensureDirSync(CACHE_DIR);
  const repo = url.split('/').slice().pop().replace('.git', '');
  const repoDir = path.join(CACHE_DIR, repo);

  // 拉取远程仓库
  if (!fs.existsSync(repoDir) || (fs.existsSync(repoDir) && !isGitRepo(repoDir))) {
    fs.rmSync(repoDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
    execSync(`git clone ${url} ${repoDir}`, { stdio: 'inherit' });
    console.log(`[pre-dev]: 成功克隆 docs 仓! `);
  }

  // 切换目标分支
  const branchList = execSync(`cd ${repoDir} && git branch --list ${branch}`).toString().trim();
  if (!branchList) {
    console.log(`[pre-dev]: 本地不存在分支 ${branch}，开始尝试拉取并切换远程分支`);
    execSync(`cd ${repoDir} && git checkout -b ${branch} --track origin/${branch}`, { stdio: 'inherit' });
    console.log(`[pre-dev]: 拉取并切换远程分支 ${branch} 成功`);
    return;
  }

  console.log(`[pre-dev]: 本地存在分支 ${branch}，开始切换分支`);
  try {
    execSync(`cd ${repoDir} && git checkout ${branch}`, { stdio: 'inherit' });
    console.log(`[pre-dev]: 切换分支成功，开始拉取远程更新内容`);
    execSync(`cd ${repoDir} && git pull origin ${branch}`, { stdio: 'inherit' });
    console.log(`[pre-dev]: 拉取远程内容成功`);
  } catch {
    console.log(`[pre-dev]: 拉取远程内容成功，尝试强制拉取`);
    execSync(`cd ${repoDir} && git reset --hard origin/${branch}`, { stdio: 'inherit' });
    console.log(`[pre-dev]: 拉取远程分支 ${branch} 内容成功`);
  }
}

/**
 * 清理已有的文档内容
 * @param {string} branchName 分支名
 */
function cleanDocsContent(branchName) {
  const zhPath = `${__dirname}/app/zh/docs/${branchName}/`;
  if (fs.existsSync(zhPath)) {
    fs.rmSync(zhPath, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
    console.log(`[pre-dev]: 成功删除 ${zhPath} 文件夹`);
  }

  const enPath = `${__dirname}/app/en/docs/${branchName}/`;
  if (fs.existsSync(enPath)) {
    fs.rmSync(enPath, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
    console.log(`[pre-dev]: 成功删除 ${enPath} 文件夹`);
  }
}

/**
 * 复制文档内容
 * @param {string} branchName 分支名
 */
function copyDocsContent(branchName) {
  cleanDocsContent(branchName);

  fs.mkdirSync(`${__dirname}/app/zh/docs/${branchName}/`, {
    recursive: true,
  });

  fs.mkdirSync(`${__dirname}/app/en/docs/${branchName}/`, {
    recursive: true,
  });

  if (fs.existsSync(`${CACHE_DIR}/docs/docs/zh/`)) {
    console.log(`[pre-dev]: ${branchName} 存在 zh 文档内容，开始复制`);
    fs.copySync(`${CACHE_DIR}/docs/docs/zh`, `${__dirname}/app/zh/docs/${branchName}`);
    console.log(`[pre-dev]: 复制 zh 内容成功`);
  }

  if (fs.existsSync(`${CACHE_DIR}/docs/docs/en/`)) {
    console.log(`[pre-dev]: ${branchName} 存在 en 文档内容，开始复制`);
    fs.copySync(`${CACHE_DIR}/docs/docs/en`, `${__dirname}/app/en/docs/${branchName}`);
    console.log(`[pre-dev]: 复制 en 内容成功`);
  }
}

/**
 * 清理已有的 dsl 内容
 */
function cleanDslContent() {
  const dslPath = `${__dirname}/app/.vitepress/public/dsl/`;
  if (fs.existsSync(dslPath)) {
    fs.rmSync(dslPath, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
    console.log(`[pre-dev]: 成功删除 ${dslPath} 文件夹`);
  }
}

/**
 * 复制 dsl 内容
 */
function copyDslContent() {
  cleanDslContent();

  fs.mkdirSync(`${__dirname}/app/.vitepress/public/dsl/`, {
    recursive: true,
  });

  console.log(`[pre-dev]: 开始复制 dsl 内容`);
  fs.copySync(`${CACHE_DIR}/docs/dsl`, `${__dirname}/app/.vitepress/public/dsl`);
  console.log(`[pre-dev]: 复制 dsl 内容成功`);
}

/**
 * 复制 sig 仓库内容到指定位置
 */
const copySigRepo = async (upstream, dir, storagePath) => {
  const { url, repo, branch, locations } = getGitUrlInfo(upstream);
  gitCloneAndCheckout(url, branch);
  const cachePath = path.join(CACHE_DIR, repo);
  const sourceDir = path.join(cachePath, ...locations.slice(0, -1));
  const destDir = storagePath ? path.join(dir, storagePath) : path.join(dir, repo, ...locations.slice(2, -1));
  copyDirectorySync(sourceDir, destDir);
  console.log(`[pre-dev]: 复制 ${sourceDir} 到 ${destDir}`);
};

/**
 * 扫描 _toc.yaml
 * @param {string} yamlPath _tom.yaml 路径
 */
function scanYaml(yamlPath) {
  const lines = fs.readFileSync(yamlPath, 'utf-8').split('\n');
  let i = 0;
  while (i < lines.length) {
    if (lines[i].includes('upstream:')) {
      const upstream = lines[i].replace('upstream:', '').trim();
      let storagePath = '';

      if (i + 1 < lines.length && lines[i + 1].includes('path:')) {
        storagePath = lines[i + 1].replace('path:', '').trim();
      }

      copySigRepo(upstream, path.dirname(yamlPath), storagePath);
    }
    i++;
  }
};

/**
 * 扫描 yaml 克隆 sig 仓
 * @param {string} targetPath 目标路径
 */
function scanYamlToCloneSigRepo(targetPath) {
  if (!fs.existsSync(targetPath)) {
    console.log(`${targetPath} 不存在`);
  }

  for (const item of fs.readdirSync(targetPath)) {
    const completePath = path.join(targetPath, item);
    if (fs.statSync(completePath).isDirectory()) {
      scanYamlToCloneSigRepo(completePath);
    } else if (item.endsWith('.yaml')) {
      scanYaml(completePath);
    }
  }
}

const syncDocs = async (branch) => {
  const branchName = getBranchName(branch);
  // 复制文档内容
  gitCloneAndCheckout('https://gitee.com/openeuler/docs.git', branch);
  copyDocsContent(branchName);
  scanYamlToCloneSigRepo(`${__dirname}/app/zh/docs/${branchName}`);
  scanYamlToCloneSigRepo(`${__dirname}/app/en/docs/${branchName}`);

  // 复制 dsl 内容
  gitCloneAndCheckout('https://gitee.com/openeuler/docs.git', 'stable-common');
  copyDslContent();
};

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('请提供分支名称');
  process.exit(1);
} else {
  syncDocs(args[0]);
}
