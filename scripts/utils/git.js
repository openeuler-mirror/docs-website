import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

export function getGitUrlInfo(gitUrl) {
  const url = new URL(gitUrl);
  const [owner, repo, __, branch, ...locations] = url.pathname.replace('/', '').split('/');

  return {
    url: `${url.origin}/${owner}/${repo}`,
    owner,
    repo,
    branch,
    locations,
  }
}

export function isGitRepo(targetPath) {
  try {
    return fs.statSync(path.join(targetPath, '.git')).isDirectory(); 
  } catch (err) {
    return false;
  }
}

export function checkoutBranch(repoPath, branchName) {
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