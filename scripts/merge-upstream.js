import fs from 'fs';
import path from 'path';

import NEW_VERSONS from './config/new-version.js'
import { getGitUrlInfo, isGitRepo, checkoutBranch } from './utils/git.js';
import { copyDirectorySync } from './utils/file.js';

const REPO_DIR = path.join(process.cwd(), '../../');
const BUILD_DIR = path.join(process.cwd(), '../../../build');

const copyRepoFromDiskCache = async (upstream, dir, storagePath) => {
  const { repo, branch, locations } = getGitUrlInfo(upstream);
  const cachePath = path.join(REPO_DIR, repo);
  if (!isGitRepo(cachePath)) {
    console.log(`不存在 ${repo} 仓库缓存，跳过~`);
  }

  await checkoutBranch(cachePath, branch);
  const sourceDir = path.join(cachePath, ...locations.slice(0, -1));
  const destDir = storagePath ? path.join(dir, storagePath) : path.join(dir, repo, ...locations.slice(2, -1));
  copyDirectorySync(sourceDir, destDir);
  console.log('复制完成');
};

const scanYaml = async (yamlPath, dir) => {
  const lines = fs.readFileSync(yamlPath, 'utf-8').split('\n');
  let i = 0;
  while (i < lines.length) {
    if (lines[i].includes('upstream:')) {
      const upstream = lines[i].replace('upstream:', '').trim();
      let storagePath = '';

      if (i + 1 < lines.length && lines[i + 1].includes('path:')) {
        storagePath = lines[i + 1].replace('path:', '').trim();
      }

      await copyRepoFromDiskCache(upstream, dir, storagePath);
    }
    i++;
  }
};

const mergeUpstream = async (targetPath) => {
  if (fs.existsSync(targetPath)) {
    for (const item of fs.readdirSync(targetPath)) {
      const completePath = path.join(targetPath, item);
      if (fs.statSync(completePath).isDirectory()) {
        await mergeUpstream(completePath);
      } else if (item.endsWith('.yaml')) {
        await scanYaml(completePath, targetPath);
      }
    }
  }
};

const merge = async () => {
  await mergeUpstream(`${BUILD_DIR}/app/zh/`);
  await mergeUpstream(`${BUILD_DIR}/app/en/`);
};

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('请提供分支名称');
  process.exit(1);
} else {
  if (NEW_VERSONS.includes(args[0])) {
    merge(args[0]);
  } else {
    console.error('非新版本内容，跳过处理~');
  }
}
