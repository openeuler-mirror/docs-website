/**
 * @vitest-environment node
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { getGitUrlInfo, isGitRepo, checkoutBranch, pullRemoteBranch, gitCloneAndCheckout } from '../../scripts/utils/git.js';
import * as fileModule from '../../scripts/utils/file.js';

vi.spyOn(console, 'log').mockImplementation(() => {});

vi.mock('child_process', () => ({
  execSync: vi.fn(),
}));

describe('getGitUrlInfo', () => {
  it('解析标准 Git URL', () => {
    const result = getGitUrlInfo('https://github.com/owner/repo/tree/main/docs');
    expect(result.owner).toBe('owner');
    expect(result.repo).toBe('repo');
    expect(result.branch).toBe('main');
    expect(result.url).toBe('https://github.com/owner/repo');
    expect(result.locations).toEqual(['docs']);
  });

  it('解析不带路径的 Git URL', () => {
    const result = getGitUrlInfo('https://github.com/owner/repo.git');
    expect(result.owner).toBe('owner');
    expect(result.repo).toBe('repo.git');
    expect(result.branch).toBeUndefined();
    expect(result.locations).toEqual([]);
  });

  it('解析带分支无路径的 Git URL', () => {
    const result = getGitUrlInfo('https://github.com/owner/repo/tree/main');
    expect(result.owner).toBe('owner');
    expect(result.repo).toBe('repo');
    expect(result.branch).toBe('main');
    expect(result.locations).toEqual([]);
  });

  it('解析嵌套路径的 Git URL', () => {
    const result = getGitUrlInfo('https://github.com/owner/repo/tree/main/a/b/c');
    expect(result.locations).toEqual(['a', 'b', 'c']);
  });

  it('解析 GitLab URL', () => {
    const result = getGitUrlInfo('https://gitlab.com/owner/repo/tree/develop/src');
    expect(result.owner).toBe('owner');
    expect(result.repo).toBe('repo');
    expect(result.branch).toBe('develop');
    expect(result.url).toBe('https://gitlab.com/owner/repo');
  });
});

describe('isGitRepo', () => {
  const testDir = './test-git-repo-dir';

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('存在 .git/config 时返回 true', () => {
    fs.mkdirSync(path.join(testDir, '.git'), { recursive: true });
    fs.writeFileSync(path.join(testDir, '.git', 'config'), 'content');
    expect(isGitRepo(testDir)).toBe(true);
  });

  it('不存在 .git/config 时返回 false', () => {
    fs.mkdirSync(testDir, { recursive: true });
    expect(isGitRepo(testDir)).toBe(false);
  });

  it('目录不存在时返回 false', () => {
    expect(isGitRepo('./non-existent-dir-xyz')).toBe(false);
  });
});

describe('checkoutBranch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('调用 execSync 执行 git checkout', () => {
    vi.mocked(execSync).mockImplementation(() => Buffer.from(''));
    checkoutBranch('/repo/path', 'main');
    expect(execSync).toHaveBeenCalledWith('git checkout main', expect.objectContaining({
      cwd: '/repo/path',
    }));
  });

  it('输出检出日志', () => {
    vi.mocked(execSync).mockImplementation(() => Buffer.from(''));
    checkoutBranch('/repo/path', 'develop');
    expect(console.log).toHaveBeenCalled();
  });
});

describe('pullRemoteBranch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('调用 execSync 执行 git pull', () => {
    vi.mocked(execSync).mockImplementation(() => Buffer.from(''));
    pullRemoteBranch('/repo/path', 'main');
    expect(execSync).toHaveBeenCalledWith('git pull origin main', expect.objectContaining({
      cwd: '/repo/path',
    }));
  });

  it('输出拉取日志', () => {
    vi.mocked(execSync).mockImplementation(() => Buffer.from(''));
    pullRemoteBranch('/repo/path', 'develop');
    expect(console.log).toHaveBeenCalled();
  });
});

describe('gitCloneAndCheckout', () => {
  const testStoragePath = './test-git-storage';

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(fileModule, 'ensureDirSync').mockImplementation(() => {});
    vi.spyOn(fileModule, 'removeSync').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (fs.existsSync(testStoragePath)) {
      fs.rmSync(testStoragePath, { recursive: true, force: true });
    }
  });

  it('仓库目录不存在时执行 git clone', () => {
    vi.spyOn(fs, 'existsSync').mockReturnValue(false);
    vi.mocked(execSync).mockImplementation(() => Buffer.from(''));
    
    gitCloneAndCheckout('https://github.com/owner/repo.git', 'main', testStoragePath);
    expect(execSync).toHaveBeenCalledWith(expect.stringContaining('git clone'), expect.any(Object));
  });

  it('目录存在但不是 Git 仓库时删除并重新克隆', () => {
    vi.spyOn(fs, 'existsSync').mockImplementation((p: string) => {
      if (typeof p === 'string' && p.includes('.git')) return false;
      return true;
    });
    vi.mocked(execSync).mockImplementation(() => Buffer.from(''));
    
    gitCloneAndCheckout('https://github.com/owner/repo.git', 'main', testStoragePath);
    expect(fileModule.removeSync).toHaveBeenCalled();
    expect(execSync).toHaveBeenCalledWith(expect.stringContaining('git clone'), expect.any(Object));
  });

  it('目录存在且是 Git 仓库时跳过克隆', () => {
    vi.spyOn(fs, 'existsSync').mockReturnValue(true);
    vi.mocked(execSync).mockImplementation(() => Buffer.from('* main'));
    
    gitCloneAndCheckout('https://github.com/owner/repo.git', 'main', testStoragePath);
    expect(fileModule.removeSync).not.toHaveBeenCalled();
    expect(execSync).toHaveBeenCalledWith('git clean -fd', expect.any(Object));
  });

  it('本地分支不存在时创建并追踪远程分支', () => {
    vi.spyOn(fs, 'existsSync').mockReturnValue(true);
    vi.mocked(execSync).mockImplementation((cmd: string) => {
      if (cmd.includes('git branch --list')) {
        return Buffer.from('');
      }
      return Buffer.from('');
    });
    
    gitCloneAndCheckout('https://github.com/owner/repo.git', 'feature', testStoragePath);
    expect(execSync).toHaveBeenCalledWith(
      expect.stringContaining('git checkout -b feature --track origin/feature'),
      expect.any(Object)
    );
  });

  it('本地分支存在时切换分支', () => {
    vi.spyOn(fs, 'existsSync').mockReturnValue(true);
    vi.mocked(execSync).mockImplementation((cmd: string) => {
      if (cmd.includes('git branch --list')) {
        return Buffer.from('* main');
      }
      return Buffer.from('');
    });
    
    gitCloneAndCheckout('https://github.com/owner/repo.git', 'main', testStoragePath);
    expect(execSync).toHaveBeenCalledWith(
      expect.stringContaining('git checkout -f main'),
      expect.any(Object)
    );
  });

  it('git pull 失败时执行 git reset --hard', () => {
    vi.spyOn(fs, 'existsSync').mockReturnValue(true);
    vi.mocked(execSync).mockImplementation((cmd: string) => {
      if (cmd.includes('git branch --list')) {
        return Buffer.from('* main');
      }
      if (cmd.includes('git pull origin main')) {
        throw new Error('pull failed');
      }
      return Buffer.from('');
    });
    
    gitCloneAndCheckout('https://github.com/owner/repo.git', 'main', testStoragePath);
    expect(execSync).toHaveBeenCalledWith(
      expect.stringContaining('git reset --hard'),
      expect.any(Object)
    );
  });

  it('执行 git clean 和 git checkout HEAD', () => {
    vi.spyOn(fs, 'existsSync').mockReturnValue(true);
    vi.mocked(execSync).mockImplementation(() => Buffer.from('* main'));
    
    gitCloneAndCheckout('https://github.com/owner/repo.git', 'main', testStoragePath);
    expect(execSync).toHaveBeenCalledWith('git clean -fd', expect.any(Object));
    expect(execSync).toHaveBeenCalledWith('git checkout HEAD -- .', expect.any(Object));
  });
});