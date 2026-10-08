/**
 * @vitest-environment node
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import {
  getGitUrlInfo,
  isGitRepo,
  checkoutBranch,
  pullRemoteBranch,
  gitCloneAndCheckout,
  getFileLastCommitIso,
  getDirectoryLastCommitMap,
} from '../../scripts/utils/git.js';
import * as fileModule from '../../scripts/utils/file.js';
import {
  copyDirectorySync,
  copyFileSync,
  removeSync,
  ensureDirSync,
  renameSync,
} from '../../scripts/utils/file.js';

vi.mock('child_process', () => ({
  execFileSync: vi.fn(),
}));

// 固定为 Windows 平台，保证 git.js 内 NTFS 相关的容错分支可稳定覆盖
vi.mock('node:os', () => ({
  platform: () => 'win32',
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

  it('解码 URL 编码的路径段', () => {
    const result = getGitUrlInfo('https://github.com/owner/repo/tree/main/a%20b/%E4%B8%AD');
    expect(result.locations).toEqual(['a b', '中']);
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
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('调用 execFileSync 执行 git checkout', () => {
    vi.mocked(execFileSync).mockReturnValue('');
    checkoutBranch('/repo/path', 'main');
    expect(execFileSync).toHaveBeenCalledWith(
      'git',
      ['checkout', 'main'],
      expect.objectContaining({ cwd: '/repo/path' }),
    );
  });

  it('输出检出日志', () => {
    vi.mocked(execFileSync).mockReturnValue('');
    checkoutBranch('/repo/path', 'develop');
    expect(console.log).toHaveBeenCalled();
  });

  it('非法分支名抛错', () => {
    expect(() => checkoutBranch('/repo/path', '')).toThrow();
    expect(() => checkoutBranch('/repo/path', '-develop')).toThrow();
    expect(() => checkoutBranch('/repo/path', 'dev..x')).toThrow();
  });
});

describe('pullRemoteBranch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('调用 execFileSync 执行 git pull', () => {
    vi.mocked(execFileSync).mockReturnValue('');
    pullRemoteBranch('/repo/path', 'main');
    expect(execFileSync).toHaveBeenCalledWith(
      'git',
      ['pull', 'origin', 'main'],
      expect.objectContaining({ cwd: '/repo/path' }),
    );
  });

  it('输出拉取日志', () => {
    vi.mocked(execFileSync).mockReturnValue('');
    pullRemoteBranch('/repo/path', 'develop');
    expect(console.log).toHaveBeenCalled();
  });

  it('非法分支名抛错', () => {
    expect(() => pullRemoteBranch('/repo/path', '')).toThrow();
    expect(() => pullRemoteBranch('/repo/path', '-develop')).toThrow();
  });
});

describe('gitCloneAndCheckout', () => {
  const url = 'https://github.com/owner/repo.git';
  const storagePath = './test-git-storage';

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(fileModule, 'ensureDirSync').mockImplementation(() => {});
    vi.spyOn(fileModule, 'removeSync').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (fs.existsSync(storagePath)) {
      fs.rmSync(storagePath, { recursive: true, force: true });
    }
  });

  function setupExists(hasRepoDir: boolean, isGit: boolean) {
    vi.spyOn(fs, 'existsSync').mockImplementation((p: unknown) => {
      const target = String(p);
      if (target.includes('.git')) return isGit;
      if (target.includes('test-git-storage')) return hasRepoDir;
      return true;
    });
  }

  function mockGitCalls(impl: (gitArgs: string[]) => string) {
    vi.mocked(execFileSync).mockImplementation((...args: unknown[]) => {
      const gitArgs = Array.isArray(args[1]) ? (args[1] as string[]) : [];
      return impl(gitArgs);
    });
  }

  it('非法仓库地址抛错', () => {
    expect(() => gitCloneAndCheckout('', 'main', storagePath)).toThrow();
    expect(() => gitCloneAndCheckout('ftp://github.com/o/r.git', 'main', storagePath)).toThrow();
    expect(() => gitCloneAndCheckout('https://github.com/o r/r.git', 'main', storagePath)).toThrow();
  });

  it('非法分支名抛错', () => {
    expect(() => gitCloneAndCheckout(url, '', storagePath)).toThrow();
    expect(() => gitCloneAndCheckout(url, '-main', storagePath)).toThrow();
    expect(() => gitCloneAndCheckout(url, 'main..x', storagePath)).toThrow();
    expect(() => gitCloneAndCheckout(url, 'a@{b', storagePath)).toThrow();
  });

  it('仓库目录不存在时克隆并切换远程分支', () => {
    setupExists(false, false);
    vi.mocked(execFileSync).mockReturnValue('');

    gitCloneAndCheckout(url, 'main', storagePath);

    expect(execFileSync).toHaveBeenCalledWith('git', expect.arrayContaining(['clone', '--', url]), expect.any(Object));
    expect(execFileSync).toHaveBeenCalledWith('git', ['clean', '-fd'], expect.any(Object));
    expect(execFileSync).toHaveBeenCalledWith('git', ['branch', '--list', 'main'], expect.any(Object));
    expect(execFileSync).toHaveBeenCalledWith('git', ['checkout', '-b', 'main', '--track', 'origin/main'], expect.any(Object));
  });

  it('目录存在但不是 Git 仓库时删除并重新克隆', () => {
    setupExists(true, false);
    vi.mocked(execFileSync).mockReturnValue('');

    gitCloneAndCheckout(url, 'main', storagePath);

    expect(fileModule.removeSync).toHaveBeenCalled();
    expect(execFileSync).toHaveBeenCalledWith('git', expect.arrayContaining(['clone', '--', url]), expect.any(Object));
  });

  it('目录存在且是 Git 仓库时跳过克隆并检出分支', () => {
    setupExists(true, true);
    mockGitCalls((gitArgs) => {
      if (gitArgs[0] === 'branch' && gitArgs[1] === '--list') return '* main';
      return '';
    });

    gitCloneAndCheckout(url, 'main', storagePath);

    expect(execFileSync).not.toHaveBeenCalledWith('git', expect.arrayContaining(['clone', '--']), expect.any(Object));
    expect(execFileSync).toHaveBeenCalledWith('git', ['clean', '-fd'], expect.any(Object));
    expect(execFileSync).toHaveBeenCalledWith('git', ['checkout', 'HEAD', '--', '.'], expect.any(Object));
    expect(execFileSync).toHaveBeenCalledWith('git', ['checkout', '-f', 'main'], expect.any(Object));
    expect(execFileSync).toHaveBeenCalledWith('git', ['pull', 'origin', 'main'], expect.any(Object));
  });

  it('本地分支不存在时创建并追踪远程分支', () => {
    setupExists(true, true);
    vi.mocked(execFileSync).mockReturnValue('');

    gitCloneAndCheckout(url, 'feature', storagePath);

    expect(execFileSync).toHaveBeenCalledWith('git', ['checkout', '-b', 'feature', '--track', 'origin/feature'], expect.any(Object));
  });

  it('拉取远程分支失败时执行 git reset --hard', () => {
    setupExists(true, true);
    mockGitCalls((gitArgs) => {
      if (gitArgs[0] === 'branch' && gitArgs[1] === '--list') return '* main';
      if (gitArgs[0] === 'pull' && gitArgs[1] === 'origin') throw new Error('pull failed');
      return '';
    });

    gitCloneAndCheckout(url, 'main', storagePath);

    expect(execFileSync).toHaveBeenCalledWith('git', ['reset', '--hard', 'origin/main'], expect.any(Object));
  });

  it('reset --hard 也失败时记录警告并恢复工作区', () => {
    setupExists(true, true);
    mockGitCalls((gitArgs) => {
      if (gitArgs[0] === 'branch' && gitArgs[1] === '--list') return '* main';
      if (gitArgs[0] === 'pull' && gitArgs[1] === 'origin') throw new Error('pull failed');
      if (gitArgs[0] === 'reset') throw new Error('reset failed');
      return '';
    });

    gitCloneAndCheckout(url, 'main', storagePath);

    expect(console.warn).toHaveBeenCalled();
    expect(execFileSync).toHaveBeenCalledWith('git', ['clean', '-fd'], expect.any(Object));
  });

  it('克隆失败时记录警告并继续', () => {
    setupExists(false, false);
    mockGitCalls((gitArgs) => {
      if (gitArgs[0] === 'clone') throw new Error('clone failed');
      return '';
    });

    gitCloneAndCheckout(url, 'main', storagePath);

    expect(console.warn).toHaveBeenCalled();
    expect(execFileSync).toHaveBeenCalledWith('git', ['branch', '--list', 'main'], expect.any(Object));
  });

  it('创建远程追踪分支失败时记录警告并恢复工作区', () => {
    setupExists(true, true);
    mockGitCalls((gitArgs) => {
      if (gitArgs[0] === 'branch' && gitArgs[1] === '--list') return '';
      if (gitArgs[0] === 'checkout' && gitArgs[1] === '-b') throw new Error('checkout -b failed');
      return '';
    });

    gitCloneAndCheckout(url, 'feature', storagePath);

    expect(console.warn).toHaveBeenCalled();
    expect(execFileSync).toHaveBeenCalledWith('git', ['clean', '-fd'], expect.any(Object));
  });

  it('工作区恢复失败时记录警告并继续', () => {
    setupExists(true, true);
    mockGitCalls((gitArgs) => {
      if (gitArgs[0] === 'clean') throw new Error('clean failed');
      if (gitArgs[0] === 'branch' && gitArgs[1] === '--list') return '* main';
      return '';
    });

    gitCloneAndCheckout(url, 'main', storagePath);

    expect(console.warn).toHaveBeenCalled();
  });

  it('移除索引中 NTFS 无法表示的文件', () => {
    setupExists(true, true);
    mockGitCalls((gitArgs) => {
      if (gitArgs[0] === 'branch' && gitArgs[1] === '--list') return '* main';
      if (gitArgs[0] === 'ls-files') return 'valid.txt\0bad.\0con.c\0dir/end. \0';
      return '';
    });

    gitCloneAndCheckout(url, 'main', storagePath);

    expect(execFileSync).toHaveBeenCalledWith('git', ['update-index', '--force-remove', '--', 'bad.'], expect.any(Object));
    expect(execFileSync).toHaveBeenCalledWith('git', ['update-index', '--force-remove', '--', 'con.c'], expect.any(Object));
    expect(execFileSync).toHaveBeenCalledWith('git', ['update-index', '--force-remove', '--', 'dir/end. '], expect.any(Object));
  });

  it('移除单个文件失败不影响其余文件', () => {
    setupExists(true, true);
    mockGitCalls((gitArgs) => {
      if (gitArgs[0] === 'branch' && gitArgs[1] === '--list') return '* main';
      if (gitArgs[0] === 'ls-files') return 'con.c\0bad.\0';
      if (gitArgs[0] === 'update-index') throw new Error('remove failed');
      return '';
    });

    expect(() => gitCloneAndCheckout(url, 'main', storagePath)).not.toThrow();
    expect(execFileSync).toHaveBeenCalledWith('git', ['update-index', '--force-remove', '--', 'con.c'], expect.any(Object));
  });
});

describe('file.js 工具函数', () => {
  const tmpDir = './test-file-tmp';

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    fs.mkdirSync(tmpDir, { recursive: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  describe('copyDirectorySync', () => {
    it('源目录不存在时跳过', () => {
      copyDirectorySync(path.join(tmpDir, 'no-src'), path.join(tmpDir, 'dest'));
      expect(fs.existsSync(path.join(tmpDir, 'dest'))).toBe(false);
    });

    it('复制目录内容（含子目录与文件）', () => {
      fs.mkdirSync(path.join(tmpDir, 'src', 'sub'), { recursive: true });
      fs.writeFileSync(path.join(tmpDir, 'src', 'a.txt'), 'a');
      fs.writeFileSync(path.join(tmpDir, 'src', 'sub', 'b.txt'), 'b');

      copyDirectorySync(path.join(tmpDir, 'src'), path.join(tmpDir, 'dest'));

      expect(fs.readFileSync(path.join(tmpDir, 'dest', 'a.txt'), 'utf-8')).toBe('a');
      expect(fs.readFileSync(path.join(tmpDir, 'dest', 'sub', 'b.txt'), 'utf-8')).toBe('b');
    });

    it('目标目录已存在时先清空', () => {
      fs.mkdirSync(path.join(tmpDir, 'src'), { recursive: true });
      fs.writeFileSync(path.join(tmpDir, 'src', 'a.txt'), 'new');
      fs.mkdirSync(path.join(tmpDir, 'dest'), { recursive: true });
      fs.writeFileSync(path.join(tmpDir, 'dest', 'old.txt'), 'old');

      copyDirectorySync(path.join(tmpDir, 'src'), path.join(tmpDir, 'dest'), true);

      expect(fs.existsSync(path.join(tmpDir, 'dest', 'old.txt'))).toBe(false);
      expect(fs.readFileSync(path.join(tmpDir, 'dest', 'a.txt'), 'utf-8')).toBe('new');
    });

    it('目标文件已存在时覆盖', () => {
      fs.mkdirSync(path.join(tmpDir, 'src'), { recursive: true });
      fs.writeFileSync(path.join(tmpDir, 'src', 'a.txt'), 'v2');
      fs.mkdirSync(path.join(tmpDir, 'dest'), { recursive: true });
      fs.writeFileSync(path.join(tmpDir, 'dest', 'a.txt'), 'v1');

      copyDirectorySync(path.join(tmpDir, 'src'), path.join(tmpDir, 'dest'));

      expect(fs.readFileSync(path.join(tmpDir, 'dest', 'a.txt'), 'utf-8')).toBe('v2');
    });

    it('静默模式不输出日志', () => {
      fs.mkdirSync(path.join(tmpDir, 'src'), { recursive: true });
      fs.writeFileSync(path.join(tmpDir, 'src', 'a.txt'), 'a');

      copyDirectorySync(path.join(tmpDir, 'src'), path.join(tmpDir, 'dest'), false, true);

      expect(fs.existsSync(path.join(tmpDir, 'dest', 'a.txt'))).toBe(true);
      expect(console.log).not.toHaveBeenCalled();
    });
  });

  describe('copyFileSync', () => {
    it('源文件不存在时跳过', () => {
      copyFileSync(path.join(tmpDir, 'no.txt'), path.join(tmpDir, 'out.txt'));
      expect(fs.existsSync(path.join(tmpDir, 'out.txt'))).toBe(false);
    });

    it('复制文件并自动创建目标目录', () => {
      fs.writeFileSync(path.join(tmpDir, 'src.txt'), 'data');
      copyFileSync(path.join(tmpDir, 'src.txt'), path.join(tmpDir, 'sub', 'dst.txt'));
      expect(fs.readFileSync(path.join(tmpDir, 'sub', 'dst.txt'), 'utf-8')).toBe('data');
    });

    it('静默模式不输出日志', () => {
      fs.writeFileSync(path.join(tmpDir, 'src.txt'), 'data');
      copyFileSync(path.join(tmpDir, 'src.txt'), path.join(tmpDir, 'dst.txt'), true);
      expect(fs.existsSync(path.join(tmpDir, 'dst.txt'))).toBe(true);
      expect(console.log).not.toHaveBeenCalled();
    });
  });

  describe('removeSync', () => {
    it('删除存在的目录', () => {
      fs.mkdirSync(path.join(tmpDir, 'del'), { recursive: true });
      fs.writeFileSync(path.join(tmpDir, 'del', 'x.txt'), 'x');

      removeSync(path.join(tmpDir, 'del'));

      expect(fs.existsSync(path.join(tmpDir, 'del'))).toBe(false);
    });

    it('路径不存在时静默跳过', () => {
      expect(() => removeSync(path.join(tmpDir, 'ghost'))).not.toThrow();
    });

    it('静默模式不输出日志', () => {
      fs.mkdirSync(path.join(tmpDir, 'del'), { recursive: true });
      removeSync(path.join(tmpDir, 'del'), true);
      expect(fs.existsSync(path.join(tmpDir, 'del'))).toBe(false);
      expect(console.log).not.toHaveBeenCalled();
    });
  });

  describe('ensureDirSync', () => {
    it('创建不存在的目录', () => {
      ensureDirSync(path.join(tmpDir, 'new-dir'));
      expect(fs.statSync(path.join(tmpDir, 'new-dir')).isDirectory()).toBe(true);
    });

    it('目录已存在时直接通过', () => {
      fs.mkdirSync(path.join(tmpDir, 'exist'), { recursive: true });
      expect(() => ensureDirSync(path.join(tmpDir, 'exist'))).not.toThrow();
    });

    it('路径是文件时抛错', () => {
      fs.writeFileSync(path.join(tmpDir, 'a-file.txt'), 'x');
      expect(() => ensureDirSync(path.join(tmpDir, 'a-file.txt'))).toThrow();
    });
  });

  describe('renameSync', () => {
    it('重命名存在的文件', () => {
      fs.writeFileSync(path.join(tmpDir, 'old.txt'), 'x');
      renameSync(path.join(tmpDir, 'old.txt'), path.join(tmpDir, 'new.txt'));
      expect(fs.existsSync(path.join(tmpDir, 'new.txt'))).toBe(true);
      expect(fs.existsSync(path.join(tmpDir, 'old.txt'))).toBe(false);
    });

    it('源不存在时静默跳过', () => {
      expect(() => renameSync(path.join(tmpDir, 'ghost'), path.join(tmpDir, 'new.txt'))).not.toThrow();
    });

    it('静默模式不输出日志', () => {
      fs.writeFileSync(path.join(tmpDir, 'old.txt'), 'x');
      renameSync(path.join(tmpDir, 'old.txt'), path.join(tmpDir, 'new.txt'), true);
      expect(fs.existsSync(path.join(tmpDir, 'new.txt'))).toBe(true);
      expect(console.log).not.toHaveBeenCalled();
    });
  });
});

describe('getFileLastCommitIso', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('将 git log 返回的 unix 秒转换为 ISO 时间', () => {
    vi.mocked(execFileSync).mockReturnValue('1700000000');
    expect(getFileLastCommitIso('/repo', 'docs/zh/a.md')).toBe('2023-11-14T22:13:20.000Z');
    expect(execFileSync).toHaveBeenCalledWith(
      'git',
      ['-c', 'core.quotePath=false', 'log', '-1', '--format=%ct', '--', 'docs/zh/a.md'],
      expect.objectContaining({ cwd: '/repo' }),
    );
  });

  it('git 输出为空时返回空串', () => {
    vi.mocked(execFileSync).mockReturnValue('');
    expect(getFileLastCommitIso('/repo', 'missing.md')).toBe('');
  });

  it('git 输出非法时返回空串', () => {
    vi.mocked(execFileSync).mockReturnValue('not-a-number');
    expect(getFileLastCommitIso('/repo', 'bad.md')).toBe('');
  });

  it('git 查询失败时返回空串并告警', () => {
    vi.mocked(execFileSync).mockImplementation(() => {
      throw new Error('git failed');
    });
    expect(getFileLastCommitIso('/repo', 'bad.md')).toBe('');
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('git failed'));
  });
});

describe('getDirectoryLastCommitMap', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('解析 git log --name-only 输出并保留每个文件第一次出现的时间', () => {
    vi.mocked(execFileSync).mockImplementation((...args: unknown[]) => {
      const gitArgs = Array.isArray(args[1]) ? (args[1] as string[]) : [];
      if (gitArgs[0] === 'rev-parse') return 'HEAD-A\n';
      if (gitArgs.includes('--name-only')) {
        return '\x011700000001\ndocs/zh/a.md\n\x011700000000\ndocs/zh/b.md\ndocs/zh/a.md\n';
      }
      return '';
    });

    const map = getDirectoryLastCommitMap('/repo-dir-a', 'docs/zh');

    expect(map.get('docs/zh/a.md')).toBe('2023-11-14T22:13:21.000Z');
    expect(map.get('docs/zh/b.md')).toBe('2023-11-14T22:13:20.000Z');
    expect(execFileSync).toHaveBeenCalledWith(
      'git',
      ['-c', 'core.quotePath=false', 'log', '--format=%x01%ct', '--name-only', '--', 'docs/zh'],
      expect.objectContaining({ cwd: '/repo-dir-a' }),
    );
  });

  it('同一仓库同一 HEAD 同一路径复用缓存', () => {
    const callArgs = { rev: 0, log: 0 };
    vi.mocked(execFileSync).mockImplementation((...args: unknown[]) => {
      const gitArgs = Array.isArray(args[1]) ? (args[1] as string[]) : [];
      if (gitArgs[0] === 'rev-parse') {
        callArgs.rev += 1;
        return 'HEAD-B\n';
      }
      if (gitArgs.includes('--name-only')) {
        callArgs.log += 1;
        return '\x011700000002\ndocs/zh/c.md\n';
      }
      return '';
    });

    const first = getDirectoryLastCommitMap('/repo-dir-b', 'docs/zh');
    const second = getDirectoryLastCommitMap('/repo-dir-b', 'docs/zh');

    expect(first).toBe(second);
    expect(callArgs.rev).toBe(2);
    expect(callArgs.log).toBe(1);
    expect(first.get('docs/zh/c.md')).toBe('2023-11-14T22:13:22.000Z');
  });

  it('git log 失败时返回空 Map 并告警', () => {
    vi.mocked(execFileSync).mockImplementation((...args: unknown[]) => {
      const gitArgs = Array.isArray(args[1]) ? (args[1] as string[]) : [];
      if (gitArgs[0] === 'rev-parse') return 'HEAD-C\n';
      if (gitArgs.includes('--name-only')) throw new Error('log failed');
      return '';
    });

    const map = getDirectoryLastCommitMap('/repo-dir-c', 'docs');
    expect(map.size).toBe(0);
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('log failed'));
  });
});
