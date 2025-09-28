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
function replaceCommonNginxRedirect(buildPath, branchName) {
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
        oldUrl = oldUrl.replace(/([.*+?^${}()|[\]\\])/g, '\\$1').replace(/ /g, '\\s');
        rewrites.push(`rewrite ^${oldUrl}$ ${newUrl} permanent;\n      `);
      }

      i++;
    }

    const nginxContent = fs.readFileSync(path.join(buildPath, 'deploy/nginx/nginx.conf'), 'utf8');
    fs.writeFileSync(path.join(buildPath, 'deploy/nginx/nginx.conf'), nginxContent.replace('#[rewrite_template]', rewrites.join('')), 'utf8');
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

/**
 * 按新版本方式处理
 * @param {string} buildPath build 目录
 * @param {string} branch 分支
 * @param {string} source 启动来源
 */
const normalizeContent = async (buildPath, branch, source) => {
  const branchName = NEW_VERSONS[branch] || getBranchName(branch);

  // 复制website-vitepress内容到build目录
  await copyContentToDir(path.join(REPO_DIR, 'website-vitepress'), buildPath);

  if (branchName == `common`) {
    // 如果是公共分支，删掉nginx.conf并将nginx.portal.conf重命名为nginx.conf
    const nginxConfPath = path.join(buildPath, 'deploy/nginx/nginx.conf');
    const nginxPortalConfPath = path.join(buildPath, 'deploy/nginx/nginx.portal.conf');
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
    const nginxPortalConfPath = path.join(buildPath, 'deploy/nginx/nginx.portal.conf');
    if (fs.existsSync(nginxPortalConfPath)) {
      fs.rmSync(nginxPortalConfPath);
      console.log(`已删除 ${nginxPortalConfPath}`);
    }

    if (fs.existsSync(`${buildPath}/app/zh/`)) {
      fs.rmSync(`${buildPath}/app/zh/`, { recursive: true, force: true });
    }

    if (fs.existsSync(`${buildPath}/app/en/`)) {
      fs.rmSync(`${buildPath}/app/en/`, { recursive: true, force: true });
    }
  }

  let vpConf = fs.readFileSync(`${buildPath}/app/.vitepress/config.ts`, 'utf8');

  if (vpConf) {
    vpConf = vpConf.replace(/assetsDir:\s*'[^']*'/, `assetsDir: '/assets/${branchName}/'`);
    fs.writeFileSync(`${buildPath}/app/.vitepress/config.ts`, vpConf, 'utf8');
  }

  let packageJson = fs.readFileSync(`${buildPath}/package.json`, 'utf8');

  if (packageJson) {
    packageJson = packageJson.replaceAll('$VERSION', branchName);
    fs.writeFileSync(`${buildPath}/package.json`, packageJson, 'utf8');
  }

  // 检出文档内容分支
  await checkoutBranch(REPO_DOCS_DIR, branch);
  await pullRemoteBranch(REPO_DOCS_DIR, branch);

  // 只有存在 zh 内容并且是新版本内容才进行复制
  if (fs.existsSync(`${REPO_DOCS_DIR}/docs/zh/`) && (fs.existsSync(`${REPO_DOCS_DIR}/docs/zh/_toc.yaml`) || branchName === 'common')) {
    fs.mkdirSync(`${buildPath}/app/zh/docs/${branchName}/`, {
      recursive: true,
    });
    await copyContentToDir(`${REPO_DOCS_DIR}/docs/zh/`, `${buildPath}/app/zh/docs/${branchName}/`);
  }

  // 只有存在 en 内容并且是新版本内容才进行复制
  if (fs.existsSync(`${REPO_DOCS_DIR}/docs/en/`) && (fs.existsSync(`${REPO_DOCS_DIR}/docs/en/_toc.yaml`) || branchName === 'common')) {
    fs.mkdirSync(`${buildPath}/app/en/docs/${branchName}/`, {
      recursive: true,
    });
    await copyContentToDir(`${REPO_DOCS_DIR}/docs/en/`, `${buildPath}/app/en/docs/${branchName}/`);
  }

  // 复制 redirect.yaml
  if (fs.existsSync(`${REPO_DOCS_DIR}/_redirect.yaml`)) {
    if (!fs.existsSync(`${buildPath}/.cache/`)) {
      fs.mkdirSync(`${buildPath}/.cache/`, {
        recursive: true,
      });
    }

    fs.copyFileSync(`${REPO_DOCS_DIR}/_redirect.yaml`, `${buildPath}/.cache/_redirect-${branchName}.yaml`);
  }

  // 复制配置
  if (branchName !== 'common') {
    await checkoutBranch(REPO_DOCS_DIR, 'stable-common');
    await pullRemoteBranch(REPO_DOCS_DIR, 'stable-common');
  }

  if (fs.existsSync(`${REPO_DOCS_DIR}/dsl/`)) {
    fs.mkdirSync(`${buildPath}/app/.vitepress/public/dsl/`, {
      recursive: true,
    });

    await copyContentToDir(`${REPO_DOCS_DIR}/dsl/`, `${buildPath}/app/.vitepress/public/dsl/`);
    if (source === 'test') {
      fs.rmSync(`${buildPath}/app/.vitepress/public/dsl/zh/home.json`);
      fs.rmSync(`${buildPath}/app/.vitepress/public/dsl/en/home.json`);
      fs.renameSync(`${buildPath}/app/.vitepress/public/dsl/zh/home_test.json`, `${buildPath}/app/.vitepress/public/dsl/zh/home.json`);
      fs.renameSync(`${buildPath}/app/.vitepress/public/dsl/en/home_test.json`, `${buildPath}/app/.vitepress/public/dsl/en/home.json`);
    }

    console.log(`已将 dsl 复制到 public 目录下`);
  }
};

/**
 * 按旧版本方式处理
 * @param {string} buildPath build 目录
 * @param {string} branch 分支
 * @param {string} source 启动来源
 */
const normalizeContentWithHugo = async (buildPath, branch, source) => {
  const branchName = getBranchName(branch);

  // 复制website-hugo内容到build目录
  await copyContentToDir(path.join(REPO_DIR, 'website-hugo'), buildPath);

  let hugoConf = fs.readFileSync(`${buildPath}/config.toml`, 'utf8');

  if (hugoConf) {
    hugoConf = hugoConf.replace(/resourceURL\s*=\s*(["'])(.*?)\1/, `resourceURL = "/docs/${branchName}/"`);
    fs.writeFileSync(`${buildPath}/config.toml`, hugoConf, 'utf8');
  }

  // 检出文档内容分支
  await checkoutBranch(REPO_DOCS_CENTRALIZED_DIR, branch);
  await pullRemoteBranch(REPO_DOCS_CENTRALIZED_DIR, branch);

  if (fs.existsSync(`${REPO_DOCS_CENTRALIZED_DIR}/docs/zh/`)) {
    fs.mkdirSync(`${buildPath}/content/zh/docs/${branchName}/`, {
      recursive: true,
    });
    await copyContentToDir(`${REPO_DOCS_CENTRALIZED_DIR}/docs/zh/`, `${buildPath}/content/zh/docs/${branchName}/`);
  }

  if (fs.existsSync(`${REPO_DOCS_CENTRALIZED_DIR}/docs/en/`)) {
    fs.mkdirSync(`${buildPath}/content/en/docs/${branchName}/`, {
      recursive: true,
    });
    await copyContentToDir(`${REPO_DOCS_CENTRALIZED_DIR}/docs/en/`, `${buildPath}/content/en/docs/${branchName}/`);
  }

  if (source === 'openatom') {
    replaceOrgDomain(path.join(buildPath, 'i18n'));
    replaceOrgDomain(path.join(buildPath, 'layouts'));
    replaceOrgDomain(path.join(buildPath, 'static'));
    replaceOrgDomain(path.join(buildPath, 'content'));
  }
};

/**
 * 合并处理内容
 * @param {string} branch 构建分支
 * @param {string} source 启动来源
 */
const merge = async (branch, source) => {
  const buildPath = path.join(process.cwd(), `../../../build/${branch}`);

  // 删除 build 目录
  if (fs.existsSync(buildPath)) {
    fs.rmSync(buildPath, { recursive: true, force: true });
  }

  // 创建 build 目录
  fs.mkdirSync(buildPath, { recursive: true });

  // 处理内容
  try {
    if (Object.keys(NEW_VERSONS).includes(branch)) {
      await checkGitRepo(REPO_DOCS_DIR);
      await normalizeContent(buildPath, branch, source);
    } else {
      await checkGitRepo(REPO_DOCS_CENTRALIZED_DIR);
      await normalizeContentWithHugo(buildPath, branch, source);
    }
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
};

/*---------- 执行脚本 ----------*/
const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('请提供分支名称');
  process.exit(1);
} else {
  merge(args[0], args[1]);
}
