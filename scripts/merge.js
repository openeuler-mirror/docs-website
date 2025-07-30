import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

import NEW_VERSONS from './config/new-version.js';
import { getBranchName } from './utils/common.js';

// 定义 repo 路径
const REPO_DIR = path.join(process.cwd(), '../../');

// 定义新版本 docs 仓库路径
const REPO_DOCS_DIR = path.join(process.cwd(), '../../docs');

// 定义老版本 docs 仓库路径
const REPO_DOCS_CENTRALIZED_DIR = path.join(process.cwd(), '../../docs-centralized');

// 定义build文件夹路径
const BUILD_DIR = path.join(process.cwd(), '../../../build');

// 删除build文件夹（如果存在）
const deleteBuildDir = (BUILD_DIR) => {
  try {
    if (fs.existsSync(BUILD_DIR)) {
      fs.rmSync(BUILD_DIR, { recursive: true, force: true });
    }
  } catch (error) {
    console.error(`删除 ${BUILD_DIR} 文件夹时出错: ${error.message}`);
    process.exit(1);
  }
};

// 创建 build 文件夹
const createBuildDir = (BUILD_DIR) => {
  try {
    fs.mkdirSync(BUILD_DIR, { recursive: true });
  } catch (error) {
    console.error(`创建 ${BUILD_DIR} 文件夹时出错: ${error.message}`);
    process.exit(1);
  }
};

// 检查是否是git仓库
const checkGitRepo = (repoPath) => {
  return new Promise((resolve, reject) => {
    const child = spawn('git', ['-C', repoPath, 'rev-parse', '--is-inside-work-tree']);
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${repoPath} 并非 Git 仓库，请重新选择。`));
      }
    });
    child.on('error', (error) => {
      reject(error);
    });
  });
};

// openatom 替换域名
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

// 增加旧版本转发
function replaceCommonNginxRedirect(branchName) {
  try {
    const rewrites = [];
    const lines = fs.readFileSync(`${REPO_DOCS_DIR}/_redirect.yaml`, 'utf8').split('\n');
    let i = 0;
    while (i < lines.length) {
      const line = lines[i].trim();
      let oldUrl, newUrl;
      if (line.endsWith('.html')) {
        [oldUrl, newUrl] = line.split(': ');
      } else {
        [oldUrl] = line.split(': ');
        newUrl = lines[++i];
      }

      oldUrl = oldUrl?.trim();
      newUrl = newUrl?.trim();
      if (oldUrl && newUrl && oldUrl !== newUrl && oldUrl.split('/')[3] === branchName) {
        oldUrl = oldUrl.replace(/([.*+?^${}()|[\]\\])/g, "\\$1").replace(/ /g, '\\s');
        rewrites.push(`rewrite ^${oldUrl}$ ${newUrl} permanent;\n      `);
      }

      i++;
    }

    if (rewrites.length > 0) {
      const nginxContent = fs.readFileSync(path.join(BUILD_DIR, 'deploy/nginx/nginx.conf'), 'utf8').replace('#[rewrite_template]', rewrites.join(''));
      console.log(nginxContent);
      fs.writeFileSync(path.join(BUILD_DIR, 'deploy/nginx/nginx.conf'), nginxContent, 'utf8');
    } else {
      fs.writeFileSync(path.join(BUILD_DIR, 'deploy/nginx/nginx.conf'), nginxContent.replace('#[rewrite_template]', ''), 'utf8');
    }

    console.log(`替换nginx转发成功`);
  } catch (err) {
    console.log(`替换nginx转发内容失败，错误原因：${err?.message}`);
  }
}

// 检出分支
const checkoutBranch = (repoPath, branchName) => {
  return new Promise((resolve, reject) => {
    const child = spawn('git', ['-C', repoPath, 'checkout', branchName]);
    child.stdout.on('data', (data) => {
      console.log(data.toString());
    });
    child.stderr.on('data', (data) => {
      console.error(data.toString());
    });
    child.on('close', (code) => {
      if (code === 0) {
        console.log(`成功在 ${repoPath} 检出 ${branchName} 分支。`);
        resolve();
      } else {
        reject(new Error(`在 ${repoPath} 检出 ${branchName} 分支时出现错误`));
      }
    });
    child.on('error', (error) => {
      reject(error);
    });
  });
};

// 拉取远程分支
const pullRemoteBranch = (repoPath, branchName) => {
  return new Promise((resolve, reject) => {
    const child = spawn('git', ['-C', repoPath, 'pull', 'origin', branchName]);
    child.stdout.on('data', (data) => {
      console.log(data.toString());
    });
    child.stderr.on('data', (data) => {
      console.error(data.toString());
    });
    child.on('close', (code) => {
      if (code === 0) {
        console.log(`成功拉取 ${repoPath} 远程 ${branchName} 分支。`);
        resolve();
      } else {
        reject(new Error(`拉取 ${repoPath} 远程 ${branchName} 分支时出现错误`));
      }
    });
    child.on('error', (error) => {
      reject(error);
    });
  });
};

// 复制仓库内容到指定文件夹，忽略.gitignore中的文件
const copyContentToDir = (originDir, destDir) => {
  const gitignorePath = path.join(originDir, '.gitignore');
  const hasGitignore = fs.existsSync(gitignorePath);
  const args = ['-av', '--exclude=.git'];
  if (hasGitignore) {
    args.push('--exclude-from', gitignorePath);
  }
  args.push(`${originDir}/`, `${destDir}/`);

  return new Promise((resolve, reject) => {
    const child = spawn('rsync', args);
    child.stdout.on('data', () => {});
    child.stderr.on('data', (data) => {
      console.error(data.toString());
    });
    child.on('close', (code) => {
      if (code === 0) {
        console.log(`成功将 ${originDir} 内容复制到 ${destDir} 文件夹。`);
        resolve();
      } else {
        reject(new Error(`复制 ${originDir} 内容到 ${destDir} 文件夹时出现错误`));
      }
    });
    child.on('error', (error) => {
      reject(error);
    });
  });
};

// 处理新版本内容
const normalizeContent = async (branch) => {
  const branchName = getBranchName(branch);

  // 复制website-v2内容到build目录
  await copyContentToDir(path.join(REPO_DIR, 'website-v2'), BUILD_DIR);

  if (branchName == `common`) {
    // 如果是公共分支，删掉nginx.conf并将nginx.portal.conf重命名为nginx.conf
    const nginxConfPath = path.join(BUILD_DIR, 'deploy/nginx/nginx.conf');
    const nginxPortalConfPath = path.join(BUILD_DIR, 'deploy/nginx/nginx.portal.conf');
    if (fs.existsSync(nginxConfPath)) {
      fs.rmSync(nginxConfPath);
      console.log(`已删除 ${nginxConfPath}`);
    }
    if (fs.existsSync(nginxPortalConfPath)) {
      fs.renameSync(nginxPortalConfPath, nginxConfPath);
      console.log(`已将 ${nginxPortalConfPath} 重命名为 ${nginxConfPath}`);
    }
  } else {
    // 如果是非公共分支，删除对应的nginx.portal.conf与中英文目录
    const nginxPortalConfPath = path.join(BUILD_DIR, 'deploy/nginx/nginx.portal.conf');
    if (fs.existsSync(nginxPortalConfPath)) {
      fs.rmSync(nginxPortalConfPath);
      console.log(`已删除 ${nginxPortalConfPath}`);
    }

    if (fs.existsSync(`${BUILD_DIR}/app/zh/`)) {
      fs.rmSync(`${BUILD_DIR}/app/zh/`, { recursive: true, force: true });
    }

    if (fs.existsSync(`${BUILD_DIR}/app/en/`)) {
      fs.rmSync(`${BUILD_DIR}/app/en/`, { recursive: true, force: true });
    }
  }

  let vpConf = fs.readFileSync(`${BUILD_DIR}/app/.vitepress/config.ts`, 'utf8');

  if (vpConf) {
    vpConf = vpConf.replace(/assetsDir:\s*'[^']*'/, `assetsDir: '/assets/${branchName}/'`);
    fs.writeFileSync(`${BUILD_DIR}/app/.vitepress/config.ts`, vpConf, 'utf8');
  }

  let packageJson = fs.readFileSync(`${BUILD_DIR}/package.json`, 'utf8');

  if (packageJson) {
    packageJson = packageJson.replace('$VERSION', branchName);
    fs.writeFileSync(`${BUILD_DIR}/package.json`, packageJson, 'utf8');
  }

  // 检出文档内容分支
  await checkoutBranch(REPO_DOCS_DIR, branch);
  await pullRemoteBranch(REPO_DOCS_DIR, branch);

  // 只有存在 zh 内容并且是新版本内容才进行复制
  if (fs.existsSync(`${REPO_DOCS_DIR}/docs/zh/`) && (fs.existsSync(`${REPO_DOCS_DIR}/docs/zh/_toc.yaml`) || branchName === 'common')) {
    fs.mkdirSync(`${BUILD_DIR}/app/zh/docs/${branchName}/`, {
      recursive: true,
    });
    await copyContentToDir(`${REPO_DOCS_DIR}/docs/zh/`, `${BUILD_DIR}/app/zh/docs/${branchName}/`);
  }

  // 只有存在 en 内容并且是新版本内容才进行复制
  if (fs.existsSync(`${REPO_DOCS_DIR}/docs/en/`) && (fs.existsSync(`${REPO_DOCS_DIR}/docs/en/_toc.yaml`) || branchName === 'common')) {
    fs.mkdirSync(`${BUILD_DIR}/app/en/docs/${branchName}/`, {
      recursive: true,
    });
    await copyContentToDir(`${REPO_DOCS_DIR}/docs/en/`, `${BUILD_DIR}/app/en/docs/${branchName}/`);
  }

  // 复制配置
  if (branchName !== 'common') {
    await checkoutBranch(REPO_DOCS_DIR, 'stable-common');
    await pullRemoteBranch(REPO_DOCS_DIR, 'stable-common');
  }

  if (fs.existsSync(`${REPO_DOCS_DIR}/dsl/`)) {
    fs.mkdirSync(`${BUILD_DIR}/app/.vitepress/public/dsl/`, {
      recursive: true,
    });

    await copyContentToDir(`${REPO_DOCS_DIR}/dsl/`, `${BUILD_DIR}/app/.vitepress/public/dsl/`);
    console.log(`已将 dsl 复制到 public 目录下`);
  }

  // 增加重定向
  if (fs.existsSync(`${REPO_DOCS_DIR}/_redirect.yaml`)) {
    replaceCommonNginxRedirect(branchName);
  }
};

// 处理老版本内容
const normalizeContentWithHugo = async (branch, source) => {
  const branchName = getBranchName(branch);

  // 复制website内容到build目录
  await copyContentToDir(path.join(REPO_DIR, 'website'), BUILD_DIR);

  let hugoConf = fs.readFileSync(`${BUILD_DIR}/config.toml`, 'utf8');

  if (hugoConf) {
    hugoConf = hugoConf.replace(/resourceURL\s*=\s*(["'])(.*?)\1/, `resourceURL = "/docs/${branchName}/"`);
    fs.writeFileSync(`${BUILD_DIR}/config.toml`, hugoConf, 'utf8');
  }

  // 检出文档内容分支
  await checkoutBranch(REPO_DOCS_CENTRALIZED_DIR, branch);
  await pullRemoteBranch(REPO_DOCS_CENTRALIZED_DIR, branch);

  if (fs.existsSync(`${REPO_DOCS_CENTRALIZED_DIR}/docs/zh/`)) {
    fs.mkdirSync(`${BUILD_DIR}/content/zh/docs/${branchName}/`, {
      recursive: true,
    });
    await copyContentToDir(`${REPO_DOCS_CENTRALIZED_DIR}/docs/zh/`, `${BUILD_DIR}/content/zh/docs/${branchName}/`);
  }

  if (fs.existsSync(`${REPO_DOCS_CENTRALIZED_DIR}/docs/en/`)) {
    fs.mkdirSync(`${BUILD_DIR}/content/en/docs/${branchName}/`, {
      recursive: true,
    });
    await copyContentToDir(`${REPO_DOCS_CENTRALIZED_DIR}/docs/en/`, `${BUILD_DIR}/content/en/docs/${branchName}/`);
  }

  if (source === 'openatom') {
    replaceOrgDomain(path.join(BUILD_DIR, 'i18n'));
    replaceOrgDomain(path.join(BUILD_DIR, 'layouts'));
    replaceOrgDomain(path.join(BUILD_DIR, 'static'));
    replaceOrgDomain(path.join(BUILD_DIR, 'content'));
  }
};

const merge = async (branch, source) => {
  deleteBuildDir(BUILD_DIR);
  createBuildDir(BUILD_DIR);
  try {
    if (NEW_VERSONS.includes(branch)) {
      await checkGitRepo(REPO_DOCS_DIR);
      await normalizeContent(branch);
    } else {
      await checkGitRepo(REPO_DOCS_CENTRALIZED_DIR);
      await normalizeContentWithHugo(branch, source);
    }
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
};

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('请提供分支名称');
  process.exit(1);
} else {
  merge(args[0], args[1]);
}
